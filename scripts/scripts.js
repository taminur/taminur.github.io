const element = document.getElementById("resume");
element.addEventListener("click", template_func.bind(null,"resume"));

document.getElementById("portfolio").addEventListener("click", template_func.bind(null,"portfolio"));
document.getElementById("contact").addEventListener("click", template_func.bind(null,"contact"));

function template_func(file_name){
  fetch("/".concat(file_name).concat(".html"))
  .then(res=>res.text())
  .then(data=>{
    document.getElementById("template").innerHTML = data
  })
}