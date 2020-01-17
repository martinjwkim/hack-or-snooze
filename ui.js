$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favoritedArticles = $("#favorited-articles");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navWelcome = $('nav-welcome')
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $submitStory = $('#submit-story');
  const $favorites = $('#favorites');
  const $myStories = $('#my-stories');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Submit Story Button Event Listener
   */
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();

    const token = localStorage.getItem("token");

    const newStory = {
      author: $("#author").val(), 
      title: $('#title').val(), 
      url: $('#url').val()
    }

    let storyObj = await storyList.addStory(token,newStory);

    const result = generateStoryHTML(storyObj);
    $allStoriesList.prepend(result);
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  //  /**
  //  * Event Handler for Clicking Submit
  //  */

  $submitStory.on("click", function() {
    // Show the Login and Create Account Forms
    $submitForm.slideToggle();
  });

   /**
   * Event Handler for Clicking Favorites
   */

  $favorites.on("click", async function() {
    hideElements();
    $favoritedArticles.show();
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateFavorites();
  });

  //  /**
  //  * Event Handler for Clicking My Stories
  //  */

  $myStories.on("click", async function() {
    // Show the Login and Create Account Forms
    hideElements();
    $favoritedArticles.hide();
    $filteredArticles.show();

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);

    await generateMyStories();
  });


  
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
    $favoritedArticles.hide();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  async function generateFavorites() {
    // get an instance of FavoriteList
    // const storyListInstance = await StoryList.getStories();
    // update our global variable
    // storyList = storyListInstance;
    $favoritedArticles.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of currentUser.favorites) {
      const result = generateFavoritesHTML(story);
      $favoritedArticles.prepend(result);
    }
  }

  async function generateMyStories() {
    // get an instance of FavoriteList
    // const storyListInstance = await StoryList.getStories();
    // update our global variable
    // storyList = storyListInstance;
    $filteredArticles.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of currentUser.ownStories) {
      const result = generateOwnStoriesHTML(story);
      $filteredArticles.append(result);
    }
  }

  

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    let starClass = "far"
    if (currentUser !== null){
      for (let currentFav of currentUser.favorites){
        if ( currentFav.storyId === story.storyId){
          starClass = "fas"
        }
      }
    }
    

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${starClass} fa-star star-icon"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    starClass = "far"

    return storyMarkup;
  }

  function generateFavoritesHTML(story) {
    let hostName = getHostName(story.url);
    
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="fas fa-star star-icon"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function generateOwnStoriesHTML(story) {
    let hostName = getHostName(story.url);
    
    // render story markup
    
    let starClass = "far"
    if (currentUser !== null){
      for (let currentFav of currentUser.favorites){
        if ( currentFav.storyId === story.storyId){
          starClass = "fas"
        }
      }
    }
    

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="fas fa-trash-alt trash-icon"></i>
        <i class="${starClass} fa-star star-icon"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  $(".articles-container").on("click",".star-icon",async function(evt){
    evt.target.classList.toggle("far")
    evt.target.classList.toggle("fas")

    let storyId = (evt.target.closest("li").id);
    let username = currentUser.username;
    let loginToken = currentUser.loginToken;

    evt.target.classList.contains("fas") ? await storyList.addFavorite(username,storyId,loginToken)
      : await storyList.removeFavorite(username,storyId,loginToken)
  })

  $(".articles-container").on("click",".trash-icon",async function(evt){
    let storyId = (evt.target.closest("li").id);
    let loginToken = currentUser.loginToken;
    await storyList.deleteStory(storyId,loginToken)
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);
    await generateMyStories();

  })

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    generateStories();
    $navLogin.hide();
    $navLogOut.show();
    $submitStory.show();
    $favorites.show();
    $myStories.show();
    $navWelcome.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
