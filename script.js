document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("calculateBtn");
    btn.addEventListener("click", calculateArbetskostnad);
  });
  
  /**
   *
   * Arbetskostnad (exkl. moms) =
   *   (C4*(0,4)*490
   *    * IF(C6=TRUE,1,08,1)
   *    * IF(C8="ojämn yta (justering behövs)",1,4,1)
   *   + IF(C7=TRUE,(SQRT(C4)*4/10)*490,0)
   *   + IF(C10=TRUE,(SQRT(C4)*4/5)*490,0)
   *   + IF(C11=TRUE,1500*CEILING(C4/50,1),0)
   *   )
   */

  function calculateArbetskostnad() {

    const yta = parseFloat(document.getElementById("yta").value);
    const rivningBefGolv = document.getElementById("rivningBefGolv").value === "true";
    const rivningLister = document.getElementById("rivningLister").value === "true";
    const underlagSkick = document.getElementById("underlagSkick").value;
    const monteringLister = document.getElementById("monteringLister").value === "true";
    const deponering = document.getElementById("deponering").value === "true";
  
    if (isNaN(yta) || yta <= 0) {
      document.getElementById("arbetskostnadExMoms").innerText =
        "Ange en giltig yta!";
      return;
    }
  
    const YTA_KOEFFICIENT = 0.4;      
    const GRUNDKOSTNAD_PER_ENHET = 490; 
    const RIVNING_MULTIPLIER = 1.08;  
    const OJAMN_YTA_MULTIPLIER = 1.4; 
    const LISTER_RIVNING_FACTOR = 4/10;  
    const MONTERING_FACTOR = 4/5;        
    const DEPONERING_COST_PER_BLOCK = 1500;
    const DEPONERING_BLOCK_SIZE = 50;
  
    let arbetskostnad = yta * YTA_KOEFFICIENT * GRUNDKOSTNAD_PER_ENHET;
  
    if (rivningBefGolv) {
      arbetskostnad *= RIVNING_MULTIPLIER;
    }
  
    if (underlagSkick === "ojamnj") {
      arbetskostnad *= OJAMN_YTA_MULTIPLIER;
    }
  
    if (rivningLister) {
      arbetskostnad += (Math.sqrt(yta) * LISTER_RIVNING_FACTOR) * GRUNDKOSTNAD_PER_ENHET;
    }
  
    if (monteringLister) {
      arbetskostnad += (Math.sqrt(yta) * MONTERING_FACTOR) * GRUNDKOSTNAD_PER_ENHET;
    }
  
    if (deponering) {
      const blocksNeeded = Math.ceil(yta / DEPONERING_BLOCK_SIZE);
      arbetskostnad += blocksNeeded * DEPONERING_COST_PER_BLOCK;
    }
  
    document.getElementById("arbetskostnadExMoms").innerText =
      "Arbetskostnad: " + arbetskostnad.toFixed(0) + " kr";
  }