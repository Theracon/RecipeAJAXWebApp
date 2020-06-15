import Search from './models/Search';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';

/* The Global State contains:
- Search object
- Current Recipe object
- Shopping List object
- Favorites object
*/

export const state = {};

/*
---- SEARCH CONTROLLER ----
*/
const controlSearch = async () => {
  // 1. Get query from view
  const query = searchView.getInput();

  if (query) {
    // 2. Create a new instance of the Search class with the query and add it to the Global State Object
    state.search = new Search(query);

    // 3. Prepare the UI for search results (recipes)
    searchView.clearInput(); // Clears the input field
    searchView.clearResults(); // Clears the results field and pagination buttons
    renderLoader(elements.searchRes); // Displays the Loading Spinner
    try {
      // 4. Fetch recipes from the recipes API
      await state.search.getResults();

      // 5. Render results to the UI
      clearLoader(); // Clears the Loading Spinner
      searchView.clearResCount();
      searchView.renderResCount();
      searchView.renderResults(state.search.result);
    } catch (error) {
      alert(error);
      clearLoader(); // Clears the Loading Spinner
    }
  }
};

elements.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  controlSearch();
});

elements.searchResPages.addEventListener('click', (event) => {
  const btn = event.target.closest('.btn-inline');
  const goToPage = parseInt(btn.dataset.page, 10);
  searchView.clearResults(); // Clears the results field and pagination buttons
  searchView.renderResults(state.search.result, goToPage); // Renders the next batch of results to the UI
});

/*
---- RECIPE CONTROLLER ----
*/
const controlRecipe = async () => {
  // get id from url
  const id = window.location.hash.replace('#', '');

  if (id) {
    // 1. prepare the UI for changes
    recipeView.clearRecipe(); //Clears the current recipe markup
    renderLoader(elements.recipe); //Displays the Loading Spinner

    // 2. Highlight selected search item
    if (state.search) {
      searchView.highlightSelected(id);
    }

    // 3. Create a new recipe object
    state.recipe = new Recipe(id);

    try {
      // 4. Get recipe data and parse ingredients
      await state.recipe.getRecipe();

      state.recipe.parseIngredients();

      // 5. calculate time and servings
      state.recipe.calcTime();
      state.recipe.calcServings();

      // 6. Render recipe to the UI
      clearLoader();
      recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
    } catch (error) {
      console.log(error);
      alert(error);
    }
  }
};

['load', 'hashchange'].forEach((event) =>
  window.addEventListener(event, controlRecipe),
);

/*
---- LIST CONTROLLER ----
*/
const controlList = () => {
  // Create a new list if there is none yet
  if (!state.list) state.list = new List();

  // Add each ingredient to the list and render the list on the UI
  state.recipe.ingredients.forEach((el) => {
    const item = state.list.addItem(el.count, el.unit, el.ingredient);
    listView.renderItem(item);
  });
};

// Handling delete and update list item
elements.shopping.addEventListener('click', (event) => {
  const id = event.target.closest('.shopping__item').dataset.itemid;

  // Handle delete button to remove an element from the UI
  if (event.target.matches('.shopping__delete, .shopping__delete *')) {
    // Delete item from the state object
    state.list.deleteItem(id);

    // Delete item from the UI
    listView.deleteItem(id);

    // Handle count update
  } else if (event.target.matches('.shopping__count-value')) {
    const val = parseFloat(event.target.value, 10);
    state.list.updateCount(id, val);
  }
});

/*
---- LIKE CONTROLLER ----
*/
const controlLike = () => {
  if (!state.likes) state.likes = new Likes();

  const currentId = state.recipe.id;

  // User has not liked current recipe
  if (!state.likes.isLiked(currentId)) {
    // Add like to the state
    const newLike = state.likes.addLike(
      currentId,
      state.recipe.title,
      state.recipe.author,
      state.recipe.img,
    );

    // Toggle the like button
    likesView.toggleLikeBtn(true);

    // Add new like to UI list
    likesView.renderLike(newLike);

    // User has liked current recipe
  } else {
    // Remove like to the state
    state.likes.deleteLike(currentId);

    // Toggle the like button
    likesView.toggleLikeBtn(false);

    // Remove like from UI list
    likesView.deleteLike(currentId);
  }

  likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore 'liked recipes' list on page load
window.addEventListener('load', () => {
  state.likes = new Likes();

  // Restore likes
  state.likes.readStorage();

  // Toggle the visibility of likes button on the UI
  likesView.toggleLikeMenu(state.likes.getNumLikes());

  // Render existing likes on the UI
  state.likes.likes.forEach((like) => {
    likesView.renderLike(like);
  });
});

// Handling recipe button clicks
elements.recipe.addEventListener('click', (event) => {
  if (event.target.matches('.btn-decrease, .btn-decrease *')) {
    // Decrease button is clicked
    if (state.recipe.servings > 1) {
      state.recipe.updateServings('dec');
      recipeView.updateServingsIngredients(state.recipe);
    }
  } else if (event.target.matches('.btn-increase, .btn-increase *')) {
    // Increase button is clicked
    state.recipe.updateServings('inc');
    recipeView.updateServingsIngredients(state.recipe);
  } else if (event.target.matches('.recipe__btn--add, recipe__btn--add *')) {
    // Add ingredients to shopping list
    controlList();
  } else if (event.target.matches('.recipe__love, .recipe__love *')) {
    // Like controller
    controlLike();
  }
});
