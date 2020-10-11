const ItemType = {
  movie: 'movie',
  series: 'series',
  episode: 'episode',
};

const ItemTypes = Object.keys(ItemType);

const API = (function () {
  const API_KEY = '3e7bc136';
  const BASE_PATH = `http://www.omdbapi.com/`;

  const createRequest = (params) => {
    const paramString = Object.keys(params)
      .map((paramName) => `${paramName}=${params[paramName]}`)
      .join('&');

    return fetch(`${BASE_PATH}?apiKey=${API_KEY}&${paramString}`).then((r) =>
      r.json()
    );
  };

  const findByType = (type, params) => createRequest({ type, ...params });

  return {
    findByType,
    findAllByTitle: (s) =>
      Promise.all(
        ItemTypes.map((type) => findByType(type, { s }))
      ).then(([movie, series, episode]) => ({ movie, series, episode })),
  };
})();
