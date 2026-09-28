;(function () {
  var fallback = {
    skin: {
      name: document.title || 'Dirigentverket',
      logo: './ks-logo.png',
      hero: './william-lampa.png',
      markAlt: ''
    }
  }
  window.TENANT = window.TENANT || fallback
  function apply(t) {
    if (!t || !t.skin) return
    window.TENANT = t
    var name = t.skin.name
    if (name) {
      var h = document.querySelector('.brandline h1')
      if (h && !h.dataset.locked) h.textContent = h.textContent
      document.querySelectorAll('.hero .mark, .brandline img').forEach(function (img) {
        if (t.skin.logo) img.src = t.skin.logo
        if (t.skin.markAlt) img.alt = t.skin.markAlt
      })
      document.querySelectorAll('.hero img.bg').forEach(function (img) {
        if (t.skin.hero) img.src = t.skin.hero
      })
      var chamber = t.skin.watchers && t.skin.watchers.chamber
      if (chamber && /^[.]?\/?[\w./-]+\.(png|jpg|jpeg|webp|svg)$/i.test(chamber)) {
        document.documentElement.style.setProperty('--watchers-chamber', 'url("' + chamber.replace(/["')\s]/g, '') + '")')
      }
    }
  }
  fetch('./tenant.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (t) { if (t) apply(t) })
    .catch(function () {})
})()
