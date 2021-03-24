"use strict";

module.exports = function loader() {
  this.callback(
    null,
    `exports.___internalHook = () => {
    return () => {};
  };
  `
  );
};
