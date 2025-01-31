let pricingData = null; 
let currentServiceKey = "";

// När sidan laddas, hämta prisdata och sätt upp händelselyssnare

document.addEventListener("DOMContentLoaded", async () => {
  pricingData = await loadPricingData();
  
  populateServiceSelect(pricingData);

  document.getElementById("serviceSelect").addEventListener("change", (e) => {
    currentServiceKey = e.target.value;
    buildFormForService(currentServiceKey);
  });
  
  document.getElementById("calculateBtn").addEventListener("click", () => {
    calculatePrice();
  });
});

// Funktion för att ladda prisdata från en JSON-fil
async function loadPricingData() {
  try {
    const response = await fetch("pricing.json");
    if (!response.ok) {
      throw new Error(`Misslyckades att ladda prisdata (status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fel vid inläsning av prisdata:", error);
    return null;
  }
}

// Funktion för att fylla dropdown med tillgängliga tjänster
function populateServiceSelect(data) {
  if (!data || !data.services) {
    console.error("Felaktig struktur på prisdata.");
    return;
  }
  const serviceSelect = document.getElementById("serviceSelect");
  serviceSelect.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.innerText = "— Välj tjänst —";
  serviceSelect.appendChild(placeholderOption);

  Object.keys(data.services).forEach((serviceKey) => {
    const service = data.services[serviceKey];
    const option = document.createElement("option");
    option.value = serviceKey;
    option.innerText = service.displayName;
    serviceSelect.appendChild(option);
  });
}

// Funktion för att bygga formulär baserat på vald tjänst
function buildFormForService(serviceKey) {
  const formContainer = document.getElementById("formContainer");
  formContainer.innerHTML = "";

  if (!pricingData || !pricingData.services[serviceKey]) {
    return;
  }

  const service = pricingData.services[serviceKey];

  service.fields.forEach((field) => {
    const label = document.createElement("label");
    label.setAttribute("for", field.id);
    label.innerText = field.label;
    formContainer.appendChild(label);

    if (field.type === "number") {
      const inputEl = document.createElement("input");
      inputEl.type = "number";
      inputEl.id = field.id;
      if (field.min) inputEl.min = field.min;
      if (field.default !== undefined) inputEl.value = field.default;
      formContainer.appendChild(inputEl);

    } else if (field.type === "select") {
      const selectEl = document.createElement("select");
      selectEl.id = field.id;
      field.options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt.value;
        optionEl.text = opt.text;
        selectEl.appendChild(optionEl);
      });
      selectEl.value = field.default;
      formContainer.appendChild(selectEl);
    }
  });
}

// Funktion för att beräkna priset baserat på formulärinmatning
function calculatePrice() {
    if (!currentServiceKey) {
      document.getElementById("calculationResult").innerText = "Välj tjänst först!";
      return;
    }
    const service = pricingData.services[currentServiceKey];
    if (!service) {
      document.getElementById("calculationResult").innerText = "Felaktig tjänst!";
      return;
    }
  
    const { yta_koefficient, grundkostnad_per_enhet } = service.baseSettings;
  
    // Hämta användarens inmatade värden
    const inputs = {};
    service.fields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el) return;
      
      if (field.type === "number") {
        inputs[field.id] = parseFloat(el.value);
      } else if (field.type === "select") {
        if (el.value === "true") {
          inputs[field.id] = true;
        } else if (el.value === "false") {
          inputs[field.id] = false;
        } else {
          inputs[field.id] = el.value;
        }
      }
    });
  
    if (!inputs.yta || isNaN(inputs.yta) || inputs.yta <= 0) {
      document.getElementById("calculationResult").innerText = 
        "Ange giltig yta!";
      return;
    }
    
    // Beräkna grundpriset (exkl. moms)
    let totalPrice = inputs.yta * yta_koefficient * grundkostnad_per_enhet;
  
    // Exempel: Om tjänsten är "golvyta", applicera extra multipliers och tillägg
    if (currentServiceKey === "golvyta") {
      const { rivningAvBefintligtGolv, ojamnYta } = service.multipliers;
      const { rivningLister, monteringLister, deponering } = service.extraCosts;
  
      if (inputs.rivningBefGolv === true) {
        totalPrice *= rivningAvBefintligtGolv; 
      }
      if (inputs.underlagSkick === "ojamn") {
        totalPrice *= ojamnYta;
      }
      if (inputs.rivningBefLister === true) {
        totalPrice += (Math.sqrt(inputs.yta) * rivningLister.factor / rivningLister.divider)
                      * grundkostnad_per_enhet;
      }
      if (inputs.monteringLister === true) {
        totalPrice += (Math.sqrt(inputs.yta) * monteringLister.factor / monteringLister.divider)
                      * grundkostnad_per_enhet;
      }
      if (inputs.deponering === true) {
        const blocksNeeded = Math.ceil(inputs.yta / deponering.blockSize);
        totalPrice += blocksNeeded * deponering.prisPerBlock;
      }
  
    } else if (currentServiceKey === "bygg") {
      // Exempel för "bygg"
      const { someSpecialMultiplier } = service.multipliers;
      const { someExtraCost } = service.extraCosts;
  
      if (inputs.someSpecialOption === true) {
        totalPrice *= someSpecialMultiplier; 
        totalPrice += someExtraCost.fixedCost;
      }
    }
  
    // Pris ex. moms
    const exMoms = totalPrice.toFixed(0);
    document.getElementById("calculationResult").innerText =
      `Pris (exkl. moms): ${exMoms} kr`;
  
    // Pris inkl. moms
    const incMomsValue = totalPrice * 1.25;
    const incMoms = incMomsValue.toFixed(0);
    document.getElementById("calculationResultIncMoms").innerText =
      `Pris (inkl. moms): ${incMoms} kr`;
  
    // Pris efter ROT
    // OBS: Detta är en förenklad variant utan max-gränser
    const rotDeduction = incMomsValue * 0.3;
    const priceAfterROT = incMomsValue - rotDeduction;
  
    document.getElementById("calculationResultROT").innerText =
      `Pris efter ROT-avdrag (30 % på arbetskostnad): ${priceAfterROT.toFixed(0)} kr`;
  }