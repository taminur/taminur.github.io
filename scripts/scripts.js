console.log("Hello world")
const element = document.getElementById("resume");
element.addEventListener("click", template_func.bind(null,"resume"));

document.getElementById("portfolio").addEventListener("click", template_func.bind(null,"portfolio"));
document.getElementById("contact").addEventListener("click", template_func.bind(null,"contact"));

function template_func(file_name){
  fetch("/".concat(file_name).concat(".html"))
  .then(res=>res.text())
  .then(data=>{
    document.getElementById("template").innerHTML = data;
    
    const submit_btn = document.getElementById('submit_btn')
    if(submit_btn){
      console.log('submit button avialable')
      submit_btn.addEventListener('click', send_msg_func);
    }
  })
}

function send_msg_func() {
  console.log("You clicked on submit button")
  let name = document.getElementById('fullname').value;
  let email = document.getElementById('email').value;
  let subject = document.getElementById('subject').value;
  let message = document.getElementById('message').value;

  var data = { name: name, email: email, subject:subject, message:message };
  console.log(data)
  fetch('http://127.0.0.1:5000/api/qgZH5UuKwBm5inw5zpTNV2L7jYge1eTFVX9cOkM', {
      method: 'POST',
      // withCredentials:true,
      // crossorigin: true,
      // mode: 'no-cors',
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
      document.getElementById('response').textContent = 'Result: ' + result.result;
  })
  .catch(error => {
      console.error('Tamim -> Error:', error);
  });
  }