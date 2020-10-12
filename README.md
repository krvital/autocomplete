# Vanilla JS Autocomplete

## Usage example

```html
<!-- some-file.html -->
<div id="autocomplete-wrapper"></div>
```

```js
// some-file.js
autocomplete(document.getElementById("autocomplete-wrapper"), {
  onSearch: searchHandler,
  onLoadMore: loadMoreHandler,
  onSelectItem: selectItemHandler,
});
```

## Configuration params

```js
{
  onSearch: Promise,
  onLoadMore: Promise,
  onSelectItem: Promise,
  noResultsMessage: string,
  itemTemplate: (itemData: Object) => string
}
```
