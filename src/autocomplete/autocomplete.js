const autocomplete = (function () {
  /**
   * Utils
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
   * Components
   */
  class AbstractComponent {
    constructor(data = {}) {
      if (new.target === AbstractComponent) {
        throw new Error("Can not instantiate AbstractComponent");
      }

      this._element = createElement(this.getTemplate(data));
      this.data = data;
      this.initEventListeners();
      this.afterInit();
    }

    getElement() {
      return this._element;
    }

    getTemplate() {
      throw new Error("_getTemplate is not defined");
    }

    initEventListeners() {}

    afterInit() {}
  }

  class NoResultsComponent extends AbstractComponent {
    getTemplate({ message }) {
      const DEFAULT_MESSAGE = "Please enter anything else";

      return `
        <div>
          <p class="ac-no-results__caption">No results found</p>
          <p class="ac-no-results__message">${message || DEFAULT_MESSAGE}</p>
        </div>
      `;
    }
  }

  class SectionComponent extends AbstractComponent {
    initEventListeners() {
      this._element.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
          this.handleClickLoadMore(e.target);
        }

        if (e.target.tagName === "LI") {
          this.data.onSelectItem(e.target.dataset.id);
        }
      });
    }

    handleClickLoadMore() {
      this.setLoadingState(true);

      this.data.onLoadMore(this.data.section).then((items) => {
        this.setLoadingState(false);
        this.addItems(items);
      });
    }

    addItems(items) {
      const listElement = this.selectListNode();
      const itemElements = createElements(this.getItemsTemplate(items));

      listElement.append(...itemElements);
    }

    setLoadingState(isLoading) {
      const buttonElement = this.selectButtonNode();

      if (isLoading) {
        buttonElement.disabled = true;
        buttonElement.innerText = "Loading...";
      } else {
        buttonElement.disabled = false;
        buttonElement.innerText = "Load more";
      }
    }

    selectListNode() {
      if (!this._listElement) {
        this._listElement = this.getElement().querySelector("ul");
      }

      return this._listElement;
    }

    selectButtonNode() {
      if (!this._buttonElement) {
        this._buttonElement = this.getElement().querySelector("button");
      }

      return this._buttonElement;
    }

    getButtonMoreTemplate() {
      return `
        <button class="ac__load-more-button" type="button">
          Load more
        </button>
      `;
    }

    getItemTemplate(item) {
      const image = item.img ?? "http://via.placeholder.com/30x40";

      return `
        <li class="ac__list-item" data-id="${item.id}">
          <img class="ac__list-item-image" src="${image}"/>
          ${item.title}
        </li>
      `;
    }

    getItemsTemplate(items, itemTemplate) {
      const template = itemTemplate || this.getItemTemplate
      return items.map(template).join("");
    }

    getTemplate({ items, section, itemTemplate }) {
      return `
        <div class="ac__section">
          <p class="ac__list-header">${section}</p>
          <ul class="ac__list" data-type="${section}">
            ${this.getItemsTemplate(items, itemTemplate)}
          </ul>
          ${this.getButtonMoreTemplate(section)}
        </div>
      `;
    }
  }

  class Autocomplete extends AbstractComponent {
    constructor(data) {
      super(data);

      const SEARCH_TIMEOUT = 500;

      this.currentSearch = "";
      this.debouncedInputChange = debounce(this.handleInputChange.bind(this), SEARCH_TIMEOUT);
    }

    initEventListeners() {
      this.inputNode.addEventListener("keyup", (e) => this.handleInputKeyup(e));

      document.addEventListener("click", (e) => {
        if (!this._element.contains(e.target)) {
          this.handleClickOutside();
        }
      });
    }

    handleInputKeyup(e) {
      this.currentSearch = e.target.value;
      this.debouncedInputChange(this.currentSearch);
    }

    handleInputChange(value) {
      if (value.length < 3) {
        hideElement(this.dropdownNode);
        return;
      }

      showElement(this.spinnerNode);

      this.data.onSearch(value).then((r) => {
        hideElement(this.spinnerNode);
        this.handleSearchFinish(r);
      });
    }

    handleClickOutside() {
      hideElement(this.dropdownNode);
    }

    handleSearchFinish(results) {
      const isSectionFilled = (section) => results[section].length > 0;
      const areResultsFound = Object.keys(results).some(isSectionFilled);

      if (areResultsFound) {
        const sections = Object.keys(results)
          .filter(isSectionFilled)
          .map((section) => this.createSection(section, results[section]));

        this.showResults(sections);
      } else {
        this.showEmptyResults();
      }
    }

    handleLoadMore(section) {
      return this.data.onLoadMore(this.currentSearch, section);
    }

    showResults(sections) {
      removeChildrenNodes(this.dropdownNode);
      this.dropdownNode.append(...sections);
      showElement(this.dropdownNode);
    }

    showEmptyResults() {
      const noResults = new NoResultsComponent(this.data.noResultsMessage);

      removeChildrenNodes(this.dropdownNode);
      this.dropdownNode.append(noResults.getElement());
      showElement(this.dropdownNode);
    }

    get spinnerNode() {
      return this._element.querySelector("[ac-element='spinner']");
    }

    get dropdownNode() {
      return this._element.querySelector("[ac-element='dropdown']");
    }

    get inputNode() {
      return this._element.querySelector("input");
    }

    createSection(section, items) {
      const sectionComponent = new SectionComponent({
        items,
        section,
        onLoadMore: this.handleLoadMore.bind(this),
        onSelectItem: this.data.onSelectItem,
        itemTemplate: this.data.itemTemplate
      });

      return sectionComponent.getElement();
    }

    getTemplate() {
      return `
        <div class="ac">
          <input class="ac__input" type="text" placeholder="Search a movie..." />
          <div class="ac__dropdown" ac-element="dropdown"></div>
          <img
            class="ac__spinner"
            ac-element="spinner"
            src="./src/autocomplete/spinner.svg"
          />
        </div>
      `;
    }
  }

  return function autocomplete(element, config = {}) {
    const noop = () => {}

    const autocomplete =  new Autocomplete({
      onSearch: config.onSearch || noop,
      onLoadMore: config.onLoadMore || noop,
      onSelectItem: config.onSelectItem || noop,
      noResultsMessage: config.noResultsMessage,
      itemTemplate: config.itemTemplate
    });

    removeChildrenNodes(element);
    element.append(autocomplete.getElement())
  };
})();
