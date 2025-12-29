// webp-swap.js
// Attempt to load .webp versions of JPG/PNG images if available.
(function(){
  function supportsWebP() {
    try {
      var canvas = document.createElement('canvas');
      if (!!(canvas.getContext && canvas.getContext('2d'))) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
      return false;
    } catch (e) { return false; }
  }

  if (!supportsWebP()) return;

  function trySwap(img) {
    if (!img || !img.src) return;
    // skip SVGs and data URLs
    if (/\.svg($|\?|#)/i.test(img.src) || /^data:/i.test(img.src)) return;
    var webpSrc = img.src.replace(/\.(jpe?g|png)(?:\?.*)?$/i, '.webp');
    if (webpSrc === img.src) return;
    var tester = new Image();
    tester.onload = function(){
      // replace only if load yields dimensions
      if (tester.width > 0 && tester.height > 0) {
        img.src = webpSrc;
      }
    };
    tester.onerror = function(){ /* no-op */ };
    tester.src = webpSrc;
  }

  document.addEventListener('DOMContentLoaded', function(){
    var imgs = document.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) {
      trySwap(imgs[i]);
    }
  });
})();
