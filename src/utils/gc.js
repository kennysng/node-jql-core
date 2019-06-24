(function (window) {
  module.exports = function gc() {
    if (typeof window === 'undefined') window = global
    if (window.gc && typeof window.gc === 'function') window.gc()
  }
})(this)