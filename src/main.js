(function () {
  const convertMovie = (rawMovieData) => ({
    id: rawMovieData.imdbID,
    img: rawMovieData.Poster === 'N/A' ? null : rawMovieData.Poster,
    title: `${rawMovieData.Title} (${rawMovieData.Year})`,
  });

  const convertType = (rawType) => (rawType.Search ?? []).map(convertMovie);

  const convertTypes = (rawTypes) =>
    Object.keys(rawTypes).reduce(
      (acc, type) => ({ ...acc, [type]: convertType(rawTypes[type]) }),
      {}
    );

  const findAllByTitle = (value) => API.findAllByTitle(value).then(convertTypes);

  const createPaginatedMovieLoader = () => {
    const initialPageType = {
      [ItemType.movie]: 1,
      [ItemType.series]: 1,
      [ItemType.episode]: 1,
    };

    const initialNextPageAvailable = {
      [ItemType.movie]: false,
      [ItemType.series]: false,
      [ItemType.episode]: false,
    };

    let currentNextPageAvailable = { ...initialNextPageAvailable };
    let currentPageType = { ...initialPageType };
    let prevValue;

    return (value, type) => {
      if (prevValue !== value) {
        currentPageType = initialPageType;
        currentNextPageAvailable = initialNextPageAvailable;
      }

      prevValue = value;

      return loadMore(value, type, ++currentPageType[type]).then((items) => {
        if (items.length === 0) {
          currentNextPageAvailable[type] = true;
        }
        return items;
      });
    };
  };

  const loadMore = (value, type, page) =>
    API.findByType(type, { s: value, page }).then(convertType);

  const autocompleteElement = document.querySelector('.ac');

  autocomplete(autocompleteElement, {
    onSearch: findAllByTitle,
    onLoadMore: createPaginatedMovieLoader(),
    onSelectItem: (id) => console.log('item ' + id + ' selected'),
    noResultsMessage:
      'Looking for movies, series or episodes? Try entering a different name',
  });
})();
