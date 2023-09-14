const bar = document.getElementById('bar');
const nav = document.getElementById('navbar');
const close = document.getElementById('close');

if(bar){
    bar.addEventListener('click' , () =>{nav.classList.add('active')})
}

if(close){
    close.addEventListener('click' , () =>{nav.classList.remove('active')})
}


// Show success message
function showSuccessMessage() {
    document.getElementById('success-message').style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
  }
  
  // Show error message
  function showErrorMessage() {
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'block';
  }
  
  // Example usage
  showSuccessMessage();
  // showErrorMessage();
  
  