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

  LNP.ui = { openModal: openModal, closeModal: closeModal, confirmDialog: confirmDialog, toast: toast };
})();
