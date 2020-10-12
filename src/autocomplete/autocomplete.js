const autocomplete = (function () {
  /**
   * Utils section
   */
  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function createElement(template) {
    const newElement = document.createElement(`div`);
    newElement.innerHTML = template;
    return newElement.firstElementChild;
  }

  function createElements(template) {
    const newElement = document.createElement(`div`);
    newElement.innerHTML = template;
    return newElement.children;
  }

  function removeChildrenNodes(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function showElement(element) {
    element.style.display = "block";
  }

  function hideElement(element) {
    element.style.display = "none";
  }

  /**
   * Components section
   */
  class AbstractComponent {
    constructor(data = {}) {
      if (new.target === AbstractComponent) {
        throw new Error("Can not instantiate AbstractComponent");
      }

      this._data = data;
      this._element = createElement(this._getTemplate(data));
      this._initEventListeners();
    }

    getElement() {
      return this._element;
    }

    _getTemplate() {
      throw new Error("_getTemplate is not defined");
    }

    _initEventListeners() {}
  }

  class NoResultsComponent extends AbstractComponent {
    _getTemplate({ message }) {
      const DEFAULT_MESSAGE = "Please enter anything else";

      return `
        <div>
          <p class="ac-no-results__caption">No results found</p>
          <p class="ac-no-results__message">${message ?? DEFAULT_MESSAGE}</p>
        </div>
      `;
    }
  }

  class SectionComponent extends AbstractComponent {
    _initEventListeners() {
      this._element.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
          this._handleClickLoadMore(e.target);
        }

        if (e.target.tagName === "LI") {
          this._data.onSelectItem(e.target.dataset.id);
        }
      });
    }

    _handleClickLoadMore() {
      this._setLoadingState(true);

      this._data.onLoadMore(this._data.section).then((items) => {
        this._setLoadingState(false);
        this._addItems(items);
      });
    }

    _addItems(items) {
      const listElement = this._getListElement();
      const itemElements = createElements(this._getItemsTemplate(items));

      listElement.append(...itemElements);
    }

    _setLoadingState(isLoading) {
      const buttonElement = this._getButtonElement();

      if (isLoading) {
        buttonElement.disabled = true;
        buttonElement.innerText = "Loading...";
      } else {
        buttonElement.disabled = false;
        buttonElement.innerText = "Load more";
      }
    }

    _getListElement() {
      if (!this._listElement) {
        this._listElement = this.getElement().querySelector("ul");
      }

      return this._listElement;
    }

    _getButtonElement() {
      if (!this._buttonElement) {
        this._buttonElement = this.getElement().querySelector("button");
      }

      return this._buttonElement;
    }

    _getButtonMoreTemplate() {
      return `
        <button class="ac__load-more-button" type="button">
          Load more
        </button>
      `;
    }

    _getItemTemplate(item) {
      const image = item.img ?? "http://via.placeholder.com/30x40";

      return `
        <li class="ac__list-item" data-id="${item.id}">
          <img class="ac__list-item-image" src="${image}"/>
          ${item.title}
        </li>
      `;
    }

    _getItemsTemplate(items) {
      return items.map(this._getItemTemplate).join("");
    }

    _getTemplate({ items, section }) {
      return `
        <div class="ac__section">
          <p class="ac__list-header">${section}</p>
          <ul class="ac__list" data-type="${section}">
            ${items.map(this._getItemTemplate).join("")}
          </ul>
          ${this._getButtonMoreTemplate(section)}
        </div>
      `;
    }
  }

  return function autocomplete(element, config = {}) {
    const DEFAULT_SEARCH_TIMEOUT = 500;

    const rootNode = element;

    const inputNode = rootNode.querySelector('[ac-element="input"]');
    const dropdownNode = rootNode.querySelector('[ac-element="dropdown"]');
    const spinnerNode = rootNode.querySelector('[ac-element="spinner"]');

    const onSearch = config.onSearch;
    const onLoadMore = config.onLoadMore;
    const onSelectItem = config.onSelectItem;
    const searchTimeout = config.searchTimeout || DEFAULT_SEARCH_TIMEOUT;

    let currentSearch = "";

    /* Event listeners */
    inputNode.addEventListener("keyup", handleInputKeyup);
    document.addEventListener("click", (e) => {
      if (!rootNode.contains(e.target)) {
        handleClickOutside();
      }
    });

    /* Handlers */
    const debouncedInputChange = debounce(handleInputChange, searchTimeout);

    function handleInputChange(value) {
      if (value.length < 3) {
        hideElement(dropdownNode);
        return;
      }

      showElement(spinnerNode);

      onSearch(value).then((r) => {
        hideElement(spinnerNode);
        handleSearchFinish(r);
      });
    }

    function handleInputKeyup(e) {
      currentSearch = e.target.value;
      debouncedInputChange(currentSearch);
    }

    function handleClickOutside() {
      hideElement(dropdownNode);
    }

    function handleLoadMore(section) {
      return onLoadMore(currentSearch, section);
    }

    function handleSearchFinish(results) {
      const isSectionFilled = (section) => results[section].length > 0;
      const areResultsFound = Object.keys(results).some(isSectionFilled);

      if (areResultsFound) {
        const createSection = (items, section) => {
          const sectionComponent = new SectionComponent({
            items,
            section,
            onLoadMore: handleLoadMore,
            onSelectItem,
          });

          return sectionComponent.getElement();
        };

        const sections = Object.keys(results)
          .filter(isSectionFilled)
          .map((section) => createSection(results[section], section));

        showResults(sections);
      } else {
        showEmptyResults();
      }
    }

    function showResults(sections) {
      removeChildrenNodes(dropdownNode);
      dropdownNode.append(...sections);
      showElement(dropdownNode);
    }

    function showEmptyResults() {
      const noResults = new NoResultsComponent();

      removeChildrenNodes(dropdownNode);
      dropdownNode.append(noResults.getElement());
      showElement(dropdownNode);
    }
  };
})();
