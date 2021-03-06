const debug = require('debug')('metalsmith:transclude-transform');
const _ = require('lodash');
const path = require('path');
const match = require('multimatch');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to transform content before transclusion.
 *
 *
 * @param {Object} options
 * @param {string} options.frontmatter Include frontmatter in parent file.
 *
 * @return {Function}
 */

function plugin(options) {
  const { patterns = ['**/*.md'], permalinks = false, folders = false } = options || {};

  return function transclude_transform(files, metalsmith) {
    const transclusion = /\s:\[.*\]\((\S*)\s?(\S*)\)/g;

    const transform = (file, key) => {
      if (match(key, patterns).length === 0) return file;

      const resolveFolders = (url, source, placeholder) => {
        debug('>>> resolveFolders        :', url);
        debug('>>> source                :', source);
        const targetKey = path.join(path.dirname(key), url);
        const matches = Object.keys(files).filter(key => key.startsWith(targetKey));
        debug('>>> Using targetKey       :', targetKey);
        if (matches.length == 0) {
          debug('>>> No target files found');
          return null;
        }
        debug('>>> Found target files    :', matches.join(' '));

        const content = matches
          .map(value =>
            path.join(
              url,
              value.replace(
                targetKey
                  .split(url + '/')
                  .slice(-1)
                  .join('/'),
                ''
              )
            )
          )
          .map(value => placeholder.replace(url, value))
          .join('\n');

        debug('>>> Content               :', content);

        return content;
      };

      const replacer = (placeholder, url) => resolveFolders(url, key, placeholder) || placeholder;

      const contents = file.contents.toString().replace(transclusion, replacer);

      return { ...file, contents: new Buffer(contents) };
    };

    const res = _.chain(files)
      .mapValues(transform)
      .value();

    Object.keys(files).forEach(key => {
      // debug('<< File keys: ', Object.keys(files[key]));
      // debug('<< Res keys: ', Object.keys(res[key]));
      if (res[key]) {
        files[key] = res[key];
      } else {
        delete files[key];
      }
    });

    return;
  };
}
