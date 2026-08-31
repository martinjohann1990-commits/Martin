/* NetPlan+ ui.js — shared modal/toast helpers used by every view. */
(function () {
  'use strict';
  var LNP = window.LNP = window.LNP || {};

  var modalRoot = null;
  function root() { return modalRoot || (modalRoot = document.getElementById('modalRoot')); }

  function closeModal() {
    var r = root();
    if (!r) return;
    r.innerHTML = '';
    r.hidden = true;
    document.removeEventListener('keydown', escHandler);
  }
  function escHandler(e) { if (e.key === 'Escape') closeModal(); }

  function openModal(title, bodyHtml, opts) {
    opts = opts || {};
    var r = root();
    if (!r) return null;
    r.hidden = false;
    r.innerHTML =
      '<div class="modal-backdrop" id="modalBackdrop">' +
      '<div class="modal" style="' + (opts.maxWidth ? 'max-width:' + opts.maxWidth + ';' : '') + '">' +
      '<div class="modal-head"><h2 style="margin:0">' + title + '</h2><button class="icon-btn" id="modalCloseBtn" aria-label="Close">&times;</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (opts.footerHtml ? '<div class="modal-foot">' + opts.footerHtml + '</div>' : '') +
      '</div></div>';
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', function (e) {
      if (e.target.id === 'modalBackdrop') closeModal();
    });
    document.addEventListener('keydown', escHandler);
    LNP.i18n.applyStatic(r);
    if (opts.onMount) opts.onMount(r);
    return { el: r, close: closeModal };
  }

  function confirmDialog(title, message, onConfirm) {
    openModal(title, '<p>' + LNP.util.escapeHtml(message) + '</p>', {
      footerHtml:
        '<button class="btn" id="cdCancel" data-t="Abbrechen">' + LNP.i18n.t('Abbrechen') + '</button>' +
        '<button class="btn btn-danger" id="cdOk" data-t="Löschen">' + LNP.i18n.t('Löschen') + '</button>',
      onMount: function (r) {
        r.querySelector('#cdCancel').addEventListener('click', closeModal);
        r.querySelector('#cdOk').addEventListener('click', function () { closeModal(); onConfirm(); });
      }
    });
  }

  /* Berechnungslogik-Anzeige: a small inline "i" button next to any card/KPI heading that opens
     a modal with the matching entry/entries from LNP.sim.FORMULA_REFERENCE — the same formulas
     already listed in full under Export & Projekt, surfaced right where the number appears
     instead of only in one long reference list. One delegated click listener handles every
     button regardless of which view re-rendered it, so views just emit the markup via infoBtn(). */
  function formulaEntry(title) {
    var all = (LNP.sim && LNP.sim.FORMULA_REFERENCE) || [];
    for (var i = 0; i < all.length; i++) if (all[i].title === title) return all[i];
    return null;
  }
  function showFormulaInfo(keys) {
    var titles = String(keys).split('|');
    var entries = titles.map(formulaEntry).filter(function (f) { return !!f; });
    if (!entries.length) return;
    var U = LNP.util, I = LNP.i18n;
    var html = entries.map(function (f) {
      return '<div style="margin-bottom:14px;"><b>' + U.escapeHtml(I.t(f.title)) + '</b>' +
        '<div class="mono" style="margin:4px 0;">' + U.escapeHtml(I.t(f.formula)) + '</div>' +
        (f.note ? '<div class="help">' + U.escapeHtml(I.t(f.note)) + '</div>' : '') + '</div>';
    }).join('');
    openModal(I.t('Berechnungslogik'), html, { maxWidth: '560px' });
  }
  function infoBtn(keys) {
    var label = LNP.i18n.t('Berechnungslogik anzeigen');
    return '<button type="button" class="info-btn js-formula-info" data-formula="' + LNP.util.escapeHtml(keys) + '" title="' + label + '" aria-label="' + label + '">&#9432;</button>';
  }
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.js-formula-info');
    if (btn) showFormulaInfo(btn.getAttribute('data-formula'));
  });

  var toastStack = null;
  function toast(message, kind) {
    toastStack = toastStack || document.getElementById('toastStack');
    if (!toastStack) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, 3400);
  }

  LNP.ui = { openModal: openModal, closeModal: closeModal, confirmDialog: confirmDialog, toast: toast, infoBtn: infoBtn, showFormulaInfo: showFormulaInfo };
})();
