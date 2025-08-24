// gram to vori
let form = document.getElementById("form_gmToVori");
if (form){
  document.getElementById("form_gmToVori").addEventListener("submit", function(e) {
  e.preventDefault();

  let gmValue = parseFloat(document.getElementById("gmInput").value);

  if (isNaN(gmValue)|| gmValue < 0.0) {
    document.getElementById("result-1").innerHTML = "❌ Please enter a valid number.";
    return;
  }

  // Convert to point
  let remaining_ptValue = Math.round(gmValue / 11.664 * 960);

  // Breakdown
  let vori = Math.floor(remaining_ptValue / 960);
  remaining_ptValue = remaining_ptValue % 960 ; // update remaining point
  
  let ana = Math.floor(remaining_ptValue / 60); 
  remaining_ptValue %= 60 ; // update remaining point

  let roti = Math.floor(remaining_ptValue / 10); 
  remaining_ptValue %= 10 ; // update remaining point

  
  // Show result
  document.getElementById("result-1").innerHTML = `
    ${gmValue} gram(s) = 
    ${vori} vori ${ana} ana ${roti} roti ${remaining_ptValue} point
  `;
});
}

// vori to gram
form = document.getElementById("form_voriToGram");
if (form) {
  document.getElementById("form_voriToGram").addEventListener("submit", function(e) {
  e.preventDefault();
  let units = {
    "vori": 0.0,
    "ana": 0.0,
    "roti": 0.0,
    "pt": 0.0
  };
  
  units["vori"] = parseFloat(document.getElementById("voriInput").value);
  units["ana"] = parseFloat(document.getElementById("anaInput").value);
  units["roti"] = parseFloat(document.getElementById("rotiInput").value);
  units["pt"] = parseFloat(document.getElementById("ptInput").value);

  for (const key in units) {
    if (isNaN(units[key])) {
      units[key] = 0.0;
    }
    if (units[key] < 0.0) {
    document.getElementById("result-2").innerHTML = "❌ Please enter a valid positive number.";
    return;
    }
  }

  let totalPt = units["vori"]*960 + units["ana"]*60 + units["roti"]*10 + units["pt"]
  let gm = totalPt / 960 *11.664 ;
  gm = Math.round(gm * 100) / 100 ; // round to two decimal places
  // Show result
  document.getElementById("result-2").innerHTML = `
    = ${gm} Gram(s)
  `;
});
}

// decimal to ana-gonda
form = document.getElementById("form_decimalToAna");
if (form) {
  document.getElementById("form_decimalToAna").addEventListener("submit", function(e) {
  e.preventDefault();

  let decimalValue = parseFloat(document.getElementById("decimalInput").value);

  if (isNaN(decimalValue)|| decimalValue < 0.0 || decimalValue > 1.0) {
    document.getElementById("result-1").innerHTML = "❌ Please enter a valid number, a decimal value less than 1.0";
    return;
  }

  // Convert to till
  let remaining_til = Math.round(decimalValue * 16 * 20 * 4 * 3 * 20);

  // Breakdown
  let ana = Math.floor(remaining_til / (20 * 4 * 3 * 20));
  remaining_til %= (20 * 4 * 3 * 20) ; // update remaining til
  
  let gonda = Math.floor(remaining_til / (4 * 3 * 20));
  remaining_til %= (4 * 3 * 20) ; // update remaining til

  let kora = Math.floor(remaining_til / (3 * 20));
  remaining_til %= (3 * 20) ; // update remaining til

  let kranti = Math.floor(remaining_til / (20));
  remaining_til %= (20) ; // update remaining til

  // Show result
  document.getElementById("result-1").innerHTML = `
    ${decimalValue} = 
    ${ana} ana ${gonda} gonda ${kora} kora ${kranti} kranti ${remaining_til} til
  `;
});
}

// Ana to Decimal
form = document.getElementById("form_anaToDecimal");
if (form) {
  document.getElementById("form_anaToDecimal").addEventListener("submit", function(e) {
  e.preventDefault();
  let units = {
    "ana": 0.0,
    "gonda": 0.0,
    "kora": 0.0,
    "kranti": 0.0,
    "til": 0.0
  };
  
  units["ana"] = parseFloat(document.getElementById("anaInput").value);
  units["gonda"] = parseFloat(document.getElementById("gondaInput").value);
  units["kora"] = parseFloat(document.getElementById("koraInput").value);
  units["kranti"] = parseFloat(document.getElementById("krantiInput").value);
  units["til"] = parseFloat(document.getElementById("tilInput").value);

  for (const key in units) {
    if (isNaN(units[key])) {
      units[key] = 0.0;
    }
    if (units[key] < 0.0) {
    document.getElementById("result-2").innerHTML = "❌ Please enter a valid integer positive number.";
    return;
    }
  }

  let til = units["ana"]*4800 + units["gonda"]*240 + units["kora"]*60 + units["kranti"]*20
  let decimalValue = til / 76800 ;
  decimalValue = Math.round(decimalValue * 10000) / 10000 ; // round to four decimal places
  // Show result
  document.getElementById("result-2").innerHTML = `
    = ${decimalValue}
  `;
});
}
