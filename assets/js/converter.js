document.getElementById("form_gmToVori").addEventListener("submit", function(e) {
  e.preventDefault();

  let gmValue = parseFloat(document.getElementById("gmInput").value);

  if (isNaN(gmValue)) {
    document.getElementById("result").innerHTML = "❌ Please enter a valid number.";
    return;
  }

  // Convert to point
  let remaining_ptValue = Math.floor(gmValue / 11.664 * 960);

  // Breakdown
  let vori = Math.floor(remaining_ptValue / 960);
  remaining_ptValue = remaining_ptValue % 960 ; // update remaining point
  
  let ana = Math.floor(remaining_ptValue / 60); 
  remaining_ptValue %= 60 ; // update remaining point

  let roti = Math.floor(remaining_ptValue / 10); 
  remaining_ptValue %= 10 ; // update remaining point

  
  // Show result
  document.getElementById("result").innerHTML = `
    ${gmValue} gm = 
    ${vori} vori ${ana} ana ${roti} roti ${remaining_ptValue} point
  `;
});
