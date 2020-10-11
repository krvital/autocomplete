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

function removeChildrenNodes(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function showElement(element) {
  element.style.display = 'block';
}

function hideElement(element) {
  element.style.display = 'none';
}

class AbstractComponent {
  constructor(data = {}) {
    if (new.target === AbstractComponent) {
      throw new Error('Can not instantiate AbstractComponent');
    }

    this._data = data;
    this._element = createElement(this._getTemplate(data));
    this._initEventListeners();
  }

  getElement() {
    return this._element;
  }

  _getTemplate() {
    throw new Error('_getTemplate is not defined');
  }

  _initEventListeners() {}
}

class NoResultsComponent extends AbstractComponent {
  _getTemplate({ message }) {
    const DEFAULT_MESSAGE = 'Please enter anything else';

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
    this._element.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        this._handleClickLoadMore(e.target);
      }
    });
  }

  _handleClickLoadMore() {
    this._disableLoadingButton();

    this._loadMore(currentSearch, this._data.name).then((items) => {
      this._enableLoadingButton();
      this._addItems(items);
    });
  }

  _addItems(items) {
    const listElement = this._getListElement();
    const itemsElement = createElement(this._getItemsTemplate(items));
    listElement.append(...itemsElement.children);
  }

  _disableLoadingButton() {
    const buttonElement = this._getButtonElement();
    buttonElement.disabled = true;
    buttonElement.innerText = 'Loading...';
  }

  _enableLoadingButton() {
    const buttonElement = this._getButtonElement();
    buttonElement.disabled = false;
    buttonElement.innerText = 'Load more';
  }

  _getListElement() {
    if (!this._listElement) {
      this._listElement = this.getElement().querySelector('ul');
    }

    return this._listElement;
  }

  _getButtonElement() {
    if (!this._buttonElement) {
      this._buttonElement = this.getElement().querySelector('button');
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
    const image = item.img ?? 'http://via.placeholder.com/30x40';

    return `
      <li class="ac__list-item" data-id="${item.id}">
        <img class="ac__list-item-image" src="${image}"/>
        ${item.title}
      </li>
    `;
  }

  _getItemsTemplate(items) {
    return items.map(this._getItemTemplate).join('');
  }

  _getTemplate({ items, type }) {
    return `
      <div>
        <p class="ac__list-header">${type}</p>
        <ul class="ac__list" data-type="${type}">
          ${items.map(this._getItemTemplate).join('')}
        </ul>
        ${this._getButtonMoreTemplate(type)}
      </div>
    `;
  }
}

class Autocomplete {
  constructor(element) {}

  _getTemplate(data) {}
}

const autocomplete = (function () {
  const DEFAULT_SEARCH_TIMEOUT = 500;

  return function autocomplete(element, config = {}) {
    const rootNode = element;

    const inputNode = rootNode.querySelector('[ac-element="input"]');
    const dropdownNode = rootNode.querySelector('[ac-element="dropdown"]');
    const spinnerNode = rootNode.querySelector('[ac-element="spinner"]');

    const dataLoader = config.dataLoader;
    const loadMore = config.onLoadMore;
    const onSelectItem = config.onSelectItem;
    const searchTimeout = config.searchTimeout || DEFAULT_SEARCH_TIMEOUT;

    let currentSearch = '';

    /* Handlers */
    const handleInputChange = () => {
      if (currentSearch.length < 3) {
        hideElement(dropdownNode);
        return;
      }

      showElement(spinnerNode);

      dataLoader(currentSearch).then((r) => {
        hideElement(spinnerNode);
        showResults(r, dropdownNode);
      });
    };

    const debouncedInputChange = debounce(handleInputChange, searchTimeout);

    const handleKeyup = (e) => {
      currentSearch = e.target.value;
      debouncedInputChange();
    };

    const handleBlur = () => hideElement(dropdownNode);

    const showResults = (results, dropdownNode) => {
      const isSectionNotEmpty = (section) => results[section].length > 0;
      const areResultsFound = Object.keys(results).some(isSectionNotEmpty);

      const createSection = (items, name) => {
        const section = new SectionComponent({ items, name, loadMore });
        return section.getElement();
      };

      const sections = Object.keys(results)
        .filter(isSectionNotEmpty)
        .map((section) => createSection(results[section], section));

      const noResults = new NoResultsComponent();

      removeChildrenNodes(dropdownNode);

      if (areResultsFound) {
        dropdownNode.append(...sections);
      } else {
        dropdownNode.append(noResults.getElement());
      }

      showElement(dropdownNode);
    };

    // const handleLoadMoreClick = (type, buttonElement) => {
    //   enableButtonLoading(buttonElement);

    //   onLoadMore(currentSearch, type).then((items) => {
    //     disableButtonLoading(buttonElement);

    //     const listElement = Array.from(
    //       dropdownNode.querySelectorAll(`.ac__list`)
    //     ).find((node) => node.dataset.type === type);

    //     const list = new ListComponent(items, type);
    //     listElement.append(...list.getElement());
    //   });
    // };

    /* Event listeners */
    inputNode.addEventListener('keyup', handleKeyup);
    // inputNode.addEventListener('blur', handleBlur);

    // dropdownNode.addEventListener('click', function (e) {
    //   if (e.target.tagName === 'BUTTON') {
    //     handleLoadMoreClick(e.target.dataset.type, e.target);
    //   }
    // });

    dropdownNode.addEventListener('click', function (e) {
      if (e.target.tagName === 'LI') {
        onSelectItem(e.target.dataset.id);
      }
    });
  };
})();
