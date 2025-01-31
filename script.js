let pricingData = null; 
let currentServiceKey = "";

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


async function loadPricingData() {
  try {
    const response = await fetch("pricing.json");
    if (!response.ok) {
      throw new Error(`Failed to load pricing data (status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading pricing data:", error);
    return null;
  }
}


function populateServiceSelect(data) {
  if (!data || !data.services) {
    console.error("Invalid pricing data structure.");
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
  
  let totalPrice = inputs.yta * yta_koefficient * grundkostnad_per_enhet;

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

    const { someSpecialMultiplier } = service.multipliers;
    const { someExtraCost } = service.extraCosts;

    if (inputs.someSpecialOption === true) {
      totalPrice *= someSpecialMultiplier;

      totalPrice += someExtraCost.fixedCost;
    }
  }

  const formatted = totalPrice.toFixed(0);
  document.getElementById("calculationResult").innerText =
    `Pris (exkl. moms): ${formatted} kr`;
}