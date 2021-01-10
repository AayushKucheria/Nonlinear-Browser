function init()
{
  chrome.runtime.sendMessage({ message: 'is_user_signed_in'},
  function(response) {
    if (response.message === 'success' && response.payload) {
      window.location.replace('./tabs_api.html');
    }
  }
)
}

init();
