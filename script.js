(function(){
  'use strict';

  /* ---------- التخزين المحلي ---------- */
  var KEY = 'daftar-alsufuf-v1';
  var warned = false;

  function load(){
    try{
      var raw = localStorage.getItem(KEY);
      if(raw){
        var d = JSON.parse(raw);
        if(d && Array.isArray(d.classes) && Array.isArray(d.questions)) return d;
      }
    }catch(e){}
    return {questions:[], classes:[]};
  }
  var data = load();

  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    }catch(e){
      if(!warned){ warned = true; toast('تعذر الحفظ في هذا المتصفح. ستبقى البيانات حتى تغلق الصفحة.'); }
      return false;
    }
  }

  /* ---------- أدوات ---------- */
  var app = document.getElementById('app');
  var state = {view:'classes', classId:null, studentId:null};
  var ORD = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];

  function uid(){ return Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function getClass(){ return data.classes.filter(function(c){return c.id===state.classId;})[0]; }
  function getStudent(){
    var c = getClass();
    return c && c.students.filter(function(s){return s.id===state.studentId;})[0];
  }
  function progress(st){
    var total = data.questions.length, done = 0;
    data.questions.forEach(function(q){ if(((st.answers||{})[q.id]||'').trim()) done++; });
    return {done:done, total:total, pct: total ? Math.round(done/total*100) : 0};
  }

  var toastTimer;
  function toast(msg){
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.hidden = true; }, 2800);
  }

  function go(view, opts){
    state.view = view;
    if(opts) Object.keys(opts).forEach(function(k){ state[k] = opts[k]; });
    render();
    window.scrollTo(0,0);
  }

  /* ---------- الصفحات ---------- */
  function classesView(){
    var cards = data.classes.map(function(c){
      return '<div class="card c'+(c.c%6)+'">'
        + '<button type="button" class="card-main" data-action="open-class" data-id="'+c.id+'">'
        + '<strong>'+esc(c.name)+'</strong><span>'+c.students.length+' طالب</span></button>'
        + '<button type="button" class="x" data-action="del-class" data-id="'+c.id+'" aria-label="حذف الصف '+esc(c.name)+'">×</button>'
        + '</div>';
    }).join('');
    return '<h1 class="page-title">الصفوف</h1>'
      + '<button type="button" class="add-box" data-action="add-class"><span class="plus" aria-hidden="true">+</span><span>قم بإضافة صف</span></button>'
      + (cards ? '<div class="grid">'+cards+'</div>' : '<p class="empty">لا توجد صفوف بعد. اضغط على المربع لإضافة أول صف.</p>');
  }

  function classView(){
    var c = getClass();
    var warn = data.questions.length ? '' :
      '<div class="note warn"><div>لم تضف أسئلة للطلاب بعد. أضفها من الإعدادات حتى تعبّي بيانات كل طالب.</div>'
      + '<button type="button" class="btn alt" data-action="go-settings">فتح الإعدادات</button></div>';
    var rows = c.students.map(function(s, i){
      var p = progress(s);
      return '<li class="srow">'
        + '<button type="button" class="sbar'+(p.total && p.pct===100 ? ' full':'')+'" data-action="open-student" data-id="'+s.id+'">'
        + '<span class="fill" style="width:'+p.pct+'%"></span>'
        + '<span class="sn">'+(i+1)+'</span>'
        + '<span class="sname">'+esc(s.name)+'</span>'
        + '<span class="spct">'+(p.total ? (p.pct===100 ? '✓ ' : '')+p.done+'/'+p.total : '—')+'</span>'
        + '</button>'
        + '<button type="button" class="x" data-action="del-student" data-id="'+s.id+'" aria-label="حذف الطالب '+esc(s.name)+'">×</button>'
        + '</li>';
    }).join('');
    return '<button type="button" class="back" data-action="go-classes">→ الصفوف</button>'
      + '<h1 class="page-title">'+esc(c.name)+' <span class="chip">'+c.students.length+' طالب</span></h1>'
      + warn
      + '<button type="button" class="add-box" data-action="add-student"><span class="plus" aria-hidden="true">+</span><span>قم بإضافة طالب</span></button>'
      + (rows ? '<ol class="slist">'+rows+'</ol>' : '<p class="empty">لا يوجد طلاب في هذا الصف بعد.</p>');
  }

  function studentView(){
    var c = getClass(), s = getStudent();
    var idx = c.students.indexOf(s);
    var p = progress(s);
    var body;
    if(!data.questions.length){
      body = '<div class="note warn"><div>يجب أن تضيف البيانات المطلوبة أولاً من الإعدادات، ثم ارجع هنا لتعبئتها لهذا الطالب.</div>'
        + '<button type="button" class="btn alt" data-action="go-settings">فتح الإعدادات</button></div>';
    }else{
      body = '<div class="qform">' + data.questions.map(function(q, i){
        return '<div class="qitem"><label for="q-'+q.id+'"><span class="qn">'+(i+1)+'</span>'+esc(q.text)+'</label>'
          + '<textarea class="field" id="q-'+q.id+'" data-q="'+q.id+'" rows="2">'+esc((s.answers||{})[q.id]||'')+'</textarea></div>';
      }).join('') + '</div>'
      + '<div class="actions">'
      + '<button type="button" class="btn primary" data-action="save-student">حفظ</button>'
      + '<button type="button" class="btn alt" data-action="save-next">'+(idx < c.students.length-1 ? 'حفظ وإكمال للتالي' : 'حفظ وإنهاء')+'</button>'
      + '</div>';
    }
    return '<button type="button" class="back" data-action="back-class">→ '+esc(c.name)+'</button>'
      + '<section class="profile"><div class="profile-head"><span class="sn">'+(idx+1)+'</span><h1 class="page-title" style="font-size:28px">'+esc(s.name)+'</h1></div>'
      + '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p.pct+'" id="meter">'
      + '<div class="fill" style="width:'+p.pct+'%"></div><span id="meter-text">'+(p.total ? p.done+' من '+p.total+' مكتمل' : 'لا توجد أسئلة')+'</span></div></section>'
      + body;
  }

  function settingsView(){
    var rows = data.questions.map(function(q, i){
      return '<li class="qrow"><div class="qtext"><span class="qn">'+(i+1)+'</span><span>'+esc(q.text)+'</span></div>'
        + '<button type="button" class="x edit" data-action="edit-question" data-id="'+q.id+'" aria-label="تعديل السؤال" title="تعديل">✎</button>'
        + '<button type="button" class="x" data-action="del-question" data-id="'+q.id+'" aria-label="حذف السؤال">×</button></li>';
    }).join('');
    return '<h1 class="page-title">الإعدادات <span class="chip">'+data.questions.length+' سؤال</span></h1>'
      + '<p style="margin:0">هذه الأسئلة تظهر عند فتح أي طالب، وبحسب عدد ما تجيب عنه يمتلئ شريط اسمه بالأخضر.</p>'
      + '<button type="button" class="add-box" data-action="add-questions"><span class="plus" aria-hidden="true">+</span><span>إضافة البيانات</span></button>'
      + (rows ? '<ol class="slist" style="list-style:none;padding:0;margin:0">'+rows+'</ol>' : '<p class="empty">لم تضف أي أسئلة بعد.</p>');
  }

  function render(){
    if((state.view==='class' || state.view==='student') && !getClass()) state.view = 'classes';
    if(state.view==='student' && !getStudent()) state.view = 'class';
    var v = state.view;
    app.innerHTML = v==='classes' ? classesView() : v==='class' ? classView() : v==='student' ? studentView() : settingsView();
    var btns = document.querySelectorAll('#menu button');
    for(var i=0;i<btns.length;i++){
      var isSettings = btns[i].dataset.action==='go-settings';
      btns[i].classList.toggle('current', isSettings ? v==='settings' : v!=='settings');
    }
  }

  /* ---------- النوافذ المنبثقة ---------- */
  var modalRoot = document.getElementById('modal-root');
  var modalActions = [];

  function closeModal(){ modalRoot.innerHTML = ''; modalActions = []; }
  function modalErr(msg){ var e = document.getElementById('m-err'); if(e) e.textContent = msg; }

  function openModal(cfg){
    modalActions = cfg.actions;
    modalRoot.innerHTML = '<div class="overlay" data-overlay><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">'
      + '<h2 id="m-title">'+cfg.title+'</h2><div class="m-body" id="m-body">'+cfg.body+'</div>'
      + '<p class="err" id="m-err" role="alert"></p>'
      + '<div class="m-actions">' + cfg.actions.map(function(a, i){
          return '<button type="button" class="btn '+a.cls+'" data-m="'+i+'">'+a.label+'</button>';
        }).join('') + '</div></div></div>';
    var first = modalRoot.querySelector('input, textarea, .btn');
    if(first) first.focus();
  }

  function runModalAction(i){
    var a = modalActions[i];
    if(!a) return;
    if(a.run() !== false) closeModal();
  }

  function confirmBox(title, text, yesLabel, onYes){
    openModal({
      title: title,
      body: '<p style="margin:0">'+text+'</p>',
      actions: [
        {label: yesLabel, cls:'danger', run: function(){ onYes(); }},
        {label: 'إلغاء', cls:'ghost', run: function(){}}
      ]
    });
  }

  function nameModal(title, label, placeholder, okLabel, onOk){
    openModal({
      title: title,
      body: '<label for="m-name">'+label+'</label><input id="m-name" class="field" type="text" maxlength="60" placeholder="'+placeholder+'" autocomplete="off">',
      actions: [
        {label: okLabel, cls:'primary', run: function(){
          var v = document.getElementById('m-name').value.trim();
          if(!v){ modalErr('اكتب الاسم أولاً.'); return false; }
          onOk(v);
        }},
        {label: 'إلغاء', cls:'ghost', run: function(){}}
      ]
    });
  }

  function qInput(n){
    var label = n < ORD.length ? 'السؤال '+ORD[n] : 'السؤال رقم '+(n+1);
    return '<div class="qin"><label for="nq-'+n+'">'+label+'</label>'
      + '<input id="nq-'+n+'" class="field nq" type="text" maxlength="120" placeholder="اكتب '+label+'" autocomplete="off"></div>';
  }

  /* ---------- الإجراءات ---------- */
  var actions = {
    'toggle-menu': function(){ setMenu(document.getElementById('menu').hidden); },
    'go-classes': function(){ setMenu(false); go('classes'); },
    'go-settings': function(){ setMenu(false); go('settings'); },

    'add-class': function(){
      nameModal('إضافة صف', 'اسم الصف', 'مثال: الصف الثالث أ', 'إضافة', function(name){
        data.classes.push({id:uid(), name:name, c:data.classes.length % 6, students:[]});
        save(); render();
      });
    },
    'open-class': function(el){ go('class', {classId: el.dataset.id}); },
    'del-class': function(el){
      var c = data.classes.filter(function(x){return x.id===el.dataset.id;})[0];
      if(!c) return;
      confirmBox('حذف الصف', 'سيتم حذف الصف «'+esc(c.name)+'» وكل طلابه وإجاباتهم.', 'حذف', function(){
        data.classes = data.classes.filter(function(x){return x.id!==c.id;});
        save(); render();
      });
    },

    'add-student': function(){
      nameModal('إضافة طالب', 'اسم الطالب', 'اكتب اسم الطالب', 'إضافة', function(name){
        getClass().students.push({id:uid(), name:name, answers:{}});
        save(); render();
      });
    },
    'open-student': function(el){ go('student', {studentId: el.dataset.id}); },
    'del-student': function(el){
      var c = getClass();
      var s = c.students.filter(function(x){return x.id===el.dataset.id;})[0];
      if(!s) return;
      confirmBox('حذف الطالب', 'سيتم حذف الطالب «'+esc(s.name)+'» وبياناته، وتتغير أرقام من بعده.', 'حذف', function(){
        c.students = c.students.filter(function(x){return x.id!==s.id;});
        save(); render();
      });
    },
    'back-class': function(){ go('class'); },
    'save-student': function(){ collectAnswers(); toast('تم الحفظ'); go('class'); },
    'save-next': function(){
      collectAnswers();
      var c = getClass(), idx = c.students.indexOf(getStudent());
      var next = c.students[idx+1];
      if(next){ toast('تم الحفظ'); go('student', {studentId: next.id}); }
      else { toast('تم الحفظ. هذا آخر طالب في الصف.'); go('class'); }
    },

    'add-questions': function(){
      openModal({
        title: 'إضافة البيانات',
        body: '<div id="q-list" style="display:flex;flex-direction:column;gap:10px">'+qInput(0)+'</div>'
          + '<button type="button" class="btn alt" data-action="more-q" style="align-self:flex-start;padding:8px 18px;font-size:16px">+ سؤال آخر</button>',
        actions: [
          {label:'حفظ', cls:'primary', run: function(){
            var vals = [].slice.call(document.querySelectorAll('.nq')).map(function(i){return i.value.trim();}).filter(Boolean);
            if(!vals.length){ modalErr('اكتب سؤالاً واحداً على الأقل.'); return false; }
            vals.forEach(function(t){ data.questions.push({id:uid(), text:t}); });
            save(); render();
          }},
          {label:'إلغاء', cls:'ghost', run: function(){}}
        ]
      });
    },
    'more-q': function(){
      var list = document.getElementById('q-list');
      var n = list.querySelectorAll('.nq').length;
      list.insertAdjacentHTML('beforeend', qInput(n));
      document.getElementById('nq-'+n).focus();
    },
    'edit-question': function(el){
      var q = data.questions.filter(function(x){return x.id===el.dataset.id;})[0];
      if(!q) return;
      openModal({
        title: 'تعديل السؤال',
        body: '<label for="m-name">نص السؤال</label><input id="m-name" class="field" type="text" maxlength="120" autocomplete="off" value="'+esc(q.text)+'">',
        actions: [
          {label:'حفظ', cls:'primary', run: function(){
            var v = document.getElementById('m-name').value.trim();
            if(!v){ modalErr('اكتب نص السؤال.'); return false; }
            q.text = v; save(); render();
          }},
          {label:'إلغاء', cls:'ghost', run: function(){}}
        ]
      });
    },
    'del-question': function(el){
      var q = data.questions.filter(function(x){return x.id===el.dataset.id;})[0];
      if(!q) return;
      confirmBox('حذف السؤال', 'سيتم حذف السؤال «'+esc(q.text)+'» وإجاباته من كل الطلاب.', 'حذف', function(){
        data.questions = data.questions.filter(function(x){return x.id!==q.id;});
        data.classes.forEach(function(c){ c.students.forEach(function(s){ delete s.answers[q.id]; }); });
        save(); render();
      });
    }
  };

  function collectAnswers(){
    var s = getStudent();
    if(!s) return;
    s.answers = s.answers || {};
    [].forEach.call(document.querySelectorAll('[data-q]'), function(t){
      var v = t.value.trim();
      if(v) s.answers[t.dataset.q] = v; else delete s.answers[t.dataset.q];
    });
    save();
  }

  function setMenu(open){
    document.getElementById('menu').hidden = !open;
    document.getElementById('menu-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', function(e){
    var m = e.target.closest('[data-m]');
    if(m){ runModalAction(+m.dataset.m); return; }
    if(e.target.hasAttribute && e.target.hasAttribute('data-overlay')){ closeModal(); return; }
    if(!e.target.closest('.menu-wrap')) setMenu(false);
    var el = e.target.closest('[data-action]');
    if(el && actions[el.dataset.action]) actions[el.dataset.action](el);
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeModal(); setMenu(false); return; }
    if(e.key === 'Enter' && e.target.tagName === 'INPUT' && modalActions.length && modalRoot.contains(e.target)){
      e.preventDefault(); runModalAction(0);
    }
  });

  // تحديث شريط التقدم مباشرة أثناء الكتابة في صفحة الطالب
  document.addEventListener('input', function(e){
    if(!e.target.matches || !e.target.matches('textarea[data-q]')) return;
    var all = document.querySelectorAll('textarea[data-q]'), done = 0;
    [].forEach.call(all, function(t){ if(t.value.trim()) done++; });
    var pct = all.length ? Math.round(done/all.length*100) : 0;
    var meter = document.getElementById('meter');
    meter.querySelector('.fill').style.width = pct+'%';
    meter.setAttribute('aria-valuenow', pct);
    document.getElementById('meter-text').textContent = done+' من '+all.length+' مكتمل';
  });

  render();
})();
