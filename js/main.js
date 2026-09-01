/* ============================================================
   FLORA INK ANALYTICS — main.js
   Dependency-free. Everything degrades gracefully and
   respects prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---- Sticky nav shadow --------------------------------- */
  var nav = document.getElementById('nav');

  /* ---- Scroll progress bar ------------------------------- */
  var bar = null;
  if (!reduce) {
    bar = document.createElement('div');
    bar.id = 'scrollbar';
    document.body.appendChild(bar);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    raf(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (nav) nav.classList.toggle('is-stuck', y > 24);
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
      }
      // gentle parallax on the hero specimen
      if (specimen && !reduce && y < window.innerHeight * 1.5) {
        specimen.style.transform = 'rotate(-1.2deg) translateY(' + (y * -0.04).toFixed(1) + 'px)';
      }
      ticking = false;
    });
  }

  var specimen = document.querySelector('.specimen');
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile menu -------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    var setMenu = function (open) {
      toggle.classList.toggle('is-open', open);
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () { setMenu(!links.classList.contains('is-open')); });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---- Mark current page in nav ------------------------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navLinks a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if ((href === here || (here === 'index.html' && href === 'index.html')) && !a.classList.contains('btn')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- Scroll reveal ----------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      document.querySelectorAll('[data-stagger]').forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child, i) {
          child.style.setProperty('--i', i);
        });
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });

      // safety net: never leave anything already on-screen hidden
      var sweep = function () {
        reveals.forEach(function (el) {
          if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) {
            el.classList.add('is-in');
          }
        });
      };
      window.addEventListener('load', function () { setTimeout(sweep, 400); });
      setTimeout(sweep, 2500);
    }
  }

  /* ---- Ink underline draw ------------------------------ */
  var marks = document.querySelectorAll('.mark');
  if (marks.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      marks.forEach(function (m) { m.classList.add('is-drawn'); });
    } else {
      var mo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-drawn'); mo.unobserve(entry.target); }
        });
      }, { threshold: 0.9 });
      marks.forEach(function (m) { mo.observe(m); });
    }
  }

  /* ---- Specimen: write the page ----------------------- */
  if (specimen) {
    var strokes = specimen.querySelectorAll('.specimen__hand path, .specimen__tbar path');
    if (reduce) {
      strokes.forEach(function (p) { p.style.strokeDashoffset = '0'; });
    } else if (strokes.length) {
      strokes.forEach(function (p, i) {
        var len = 400;
        try { len = Math.ceil(p.getTotalLength()) || 400; } catch (e) {}
        p.style.setProperty('--len', len);
      });
      // index within each group for stagger
      [specimen.querySelectorAll('.specimen__hand path'), specimen.querySelectorAll('.specimen__tbar path')]
        .forEach(function (grp) {
          Array.prototype.forEach.call(grp, function (p, i) { p.style.setProperty('--i', i); });
        });
      if ('IntersectionObserver' in window) {
        var so = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { specimen.classList.add('is-writing'); so.disconnect(); }
          });
        }, { threshold: 0.3 });
        so.observe(specimen);
      } else {
        specimen.classList.add('is-writing');
      }
    }
  }

  /* ---- Buttons: ink wells from the pointer ------------ */
  if (!reduce) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---- Anchor smooth-scroll with nav offset ----------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ---- Contact form ----------------------------------------
     No backend wired: opens the visitor's mail client with the
     message pre-filled. To collect submissions, set FORM_ENDPOINT
     to a Formspree / Web3Forms URL.
     --------------------------------------------------------- */
  var FORM_ENDPOINT = '';
  var CONTACT_EMAIL = 'florody@hotmail.com';
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = document.getElementById('formOk');
      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      var interest = (data.get('interest') || '').toString().trim();
      var message = (data.get('message') || '').toString().trim();

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
          .then(function (r) { if (r.ok) { form.reset(); if (ok) ok.classList.add('is-visible'); } })
          .catch(function () {});
        return;
      }
      var subject = 'Handwriting analysis enquiry' + (name ? ' — ' + name : '');
      var body = 'Name: ' + name + '\n' + 'Email: ' + email + '\n' +
        (interest ? 'Interested in: ' + interest + '\n' : '') + '\n' + message + '\n';
      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (ok) ok.classList.add('is-visible');
      form.reset();
    });
  }

  /* ---- Blog index: pull published posts --------------- */
  var postList = document.getElementById('cmsPosts');
  if (postList) {
    fetch('posts/index.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { posts: [] }; })
      .then(function (data) {
        var posts = (data && data.posts) || [];
        if (!posts.length) return;
        postList.innerHTML = '';
        posts.forEach(function (p) {
          var a = document.createElement('a');
          a.className = 'card article-card reveal is-in';
          a.href = 'blog-' + p.slug + '.html';
          a.innerHTML =
            '<span class="article-meta">' + esc(p.date || '') + (p.readingTime ? ' &middot; ' + esc(p.readingTime) : '') + '</span>' +
            '<h3>' + esc(p.title || 'Untitled') + '</h3>' +
            '<p>' + esc(p.excerpt || '') + '</p>' +
            '<span class="tlink">Read <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span>';
          postList.appendChild(a);
        });
      })
      .catch(function () {});
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- Footer year ----------------------------------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
