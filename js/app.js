// المنطق الشامل لتطبيق "خبير التغذية المصري & أكلي" - يجمع مميزات FITNESS-APP-GEM + الشغل المكتبي + استئصال المرارة + الذكاء الاصطناعي + التعديل الكامل

const STORAGE_KEY = 'egy_nutritionist_state_v3';

function getTodayDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPrevDateString(currDateStr) {
  const [y, m, d] = currDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getTodayDateString(dt);
}

const DEFAULT_STATE = {
  selectedDate: getTodayDateString(),
  activeTab: 'dashboard', // 'dashboard' | 'foods' | 'ai' | 'insights' | 'supplements' | 'profile'
  selectedCategory: 'all',
  searchQuery: '',
  profile: {
    name: 'بطل الشغل المكتبي',
    gender: 'male',
    weight: 82,
    height: 175,
    age: 29,
    activity: 'sedentary',
    workStyle: 'شغل مكتبي / ريموت (جلوس طويل)',
    foodSource: 'مطاعم وأكل شارع ودليفري',
    workStart: '09:00',
    workEnd: '18:00',
    reminderTime: '20:00',
    goal: 'fat_loss', // 'fat_loss' | 'maintain' | 'muscle'
    gallbladderRemoved: true, // شايل المرارة (قابل للتعديل)
    colonSensitive: true,
    maxFatPerMeal: 14, // الحد الأقصى الآمن للدهون في الوجبة الواحدة لمن أزال المرارة (جم)
    medicalNotes: 'شايل المرارة: أحتاج تقسيم الدهون على مدار اليوم، تجنب المقليات والتومية الثقيلة، والتركيز على الألياف الذائبة.',
    targets: {
      calories: 1900,
      protein: 135,
      carbs: 205,
      fats: 55,
      fiber: 32,
      sodiumMax: 2200,
      iron: 14,
      calcium: 1000,
      potassium: 3000,
      waterCups: 10, // الكوب = 250 مل
      stretchBreaks: 6
    }
  },
  // سجلات متعددة الأيام لدعم اختيار التاريخ ومتابعة آخر 7 أيام ونسخ وجبات امبارح
  logsByDate: {},
  foodsDb: null,
  supplementsList: null,
  reminders: null,
  geminiApiKey: '',
  aiHistory: [
    {
      role: 'assistant',
      text: 'أهلاً بك يا بطل! 👨‍💻🩺 جمعتلك هنا كل مميزات **خبير التغذية المصري** مع مميزات تطبيق **أكلي (FITNESS-APP-GEM)**، ومضبوط لطبيعة **شغلك المكتبي** وإنك **شايل المرارة**:\n• تقدر تختار أي تاريخ أو تنسخ وجبات امبارح بضغطة زر.\n• تقسيم وجباتك لـ (فطار • غدا • عشا • سناك) مع حساب دهون كل وجبة لوحدها لحماية الهضم بدون مرارة.\n• متابعة رسوم بيانية لآخر 7 أيام وتنزيل تذكير تقويم الآيفون (.ics).',
      parsedMeal: null
    }
  ]
};

let state = loadState();
let reminderTimers = [];

function ensureDayLog(dateStr) {
  if (!state.logsByDate) state.logsByDate = {};
  if (!state.logsByDate[dateStr]) {
    state.logsByDate[dateStr] = {
      meals: [],
      waterCups: 0,
      stretchBreaks: 0,
      supplementsTaken: {}
    };
  }
  return state.logsByDate[dateStr];
}

function getCurrentDayLog() {
  return ensureDayLog(state.selectedDate || getTodayDateString());
}

function loadState() {
  try {
    const base = structuredClone(DEFAULT_STATE);
    base.foodsDb = structuredClone(window.EGYPTIAN_FOODS_DB || []);
    base.supplementsList = structuredClone(window.DEFAULT_SUPPLEMENTS || []);
    base.reminders = structuredClone(window.DEFAULT_REMINDERS || []);

    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('egy_nutritionist_state_v2');
    if (!raw) {
      base.logsByDate[base.selectedDate] = {
        meals: [],
        waterCups: 0,
        stretchBreaks: 0,
        supplementsTaken: {}
      };
      return base;
    }

    const parsed = JSON.parse(raw);
    const today = getTodayDateString();
    const logsByDate = parsed.logsByDate || {};

    // ترحيل سجل النسخة السابقة إذا وجد
    if (parsed.todayLog && parsed.currentDate && !logsByDate[parsed.currentDate]) {
      logsByDate[parsed.currentDate] = parsed.todayLog;
    }

    const merged = {
      ...base,
      ...parsed,
      selectedDate: today,
      logsByDate,
      profile: {
        ...base.profile,
        ...(parsed.profile || {}),
        targets: {
          ...base.profile.targets,
          ...(parsed.profile?.targets || {})
        }
      },
      foodsDb: Array.isArray(parsed.foodsDb) && parsed.foodsDb.length >= 30 ? parsed.foodsDb : base.foodsDb,
      supplementsList:
        Array.isArray(parsed.supplementsList) && parsed.supplementsList.length > 0
          ? parsed.supplementsList
          : base.supplementsList,
      reminders:
        Array.isArray(parsed.reminders) && parsed.reminders.length > 0 ? parsed.reminders : base.reminders
    };

    if (!merged.logsByDate[merged.selectedDate]) {
      merged.logsByDate[merged.selectedDate] = {
        meals: [],
        waterCups: 0,
        stretchBreaks: 0,
        supplementsTaken: {}
      };
    }
    return merged;
  } catch (e) {
    console.error('Error loading state:', e);
    const fallback = structuredClone(DEFAULT_STATE);
    fallback.foodsDb = structuredClone(window.EGYPTIAN_FOODS_DB || []);
    fallback.supplementsList = structuredClone(window.DEFAULT_SUPPLEMENTS || []);
    fallback.reminders = structuredClone(window.DEFAULT_REMINDERS || []);
    return fallback;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function getTotalsForMeals(mealsArray) {
  return (mealsArray || []).reduce(
    (acc, item) => {
      const m = Number(item.multiplier || 1);
      const mealFat = Math.round((item.fats ?? item.fat ?? 0) * m * 10) / 10;
      acc.calories += Math.round((item.calories || 0) * m);
      acc.protein += Math.round((item.protein || 0) * m * 10) / 10;
      acc.carbs += Math.round((item.carbs || 0) * m * 10) / 10;
      acc.fats += mealFat;
      acc.fiber += Math.round((item.fiber || 0) * m * 10) / 10;
      acc.sodium += Math.round((item.sodium || 0) * m);
      acc.iron += Math.round((item.iron || 0) * m * 10) / 10;
      acc.calcium += Math.round((item.calcium || 0) * m);
      acc.potassium += Math.round((item.potassium || 0) * m);
      if (mealFat > acc.maxSingleMealFat) {
        acc.maxSingleMealFat = mealFat;
        acc.heaviestFatMealName = item.name;
      }
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sodium: 0,
      iron: 0,
      calcium: 0,
      potassium: 0,
      maxSingleMealFat: 0,
      heaviestFatMealName: ''
    }
  );
}

function getTodayTotals() {
  return getTotalsForMeals(getCurrentDayLog().meals);
}

// تغيير التاريخ المختار (ميزة تطبيق أكلي FITNESS-APP-GEM)
window.changeSelectedDate = function (newDateStr) {
  if (!newDateStr) return;
  state.selectedDate = newDateStr;
  ensureDayLog(newDateStr);
  saveState();
  renderApp();
};

// نسخ وجبات اليوم السابق (ميزة تطبيق أكلي FITNESS-APP-GEM)
window.copyYesterdayMeals = function () {
  const prevDate = getPrevDateString(state.selectedDate);
  const prevLog = state.logsByDate[prevDate];
  if (!prevLog || !prevLog.meals || prevLog.meals.length === 0) {
    showToast('لا توجد وجبات مسجلة في اليوم السابق لنسخها');
    return;
  }
  const currLog = getCurrentDayLog();
  prevLog.meals.forEach((m) => {
    currLog.meals.push({
      ...structuredClone(m),
      logId: 'log_copy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    });
  });
  saveState();
  showToast(`تم نسخ ${prevLog.meals.length} وجبات من يوم أمس بنجاح! ↻`);
  renderApp();
};

// تنزيل ملف تذكير تقويم الآيفون (.ics) (ميزة تطبيق أكلي FITNESS-APP-GEM)
window.downloadIcsCalendarReminder = function () {
  const reminderTime = state.profile.reminderTime || '20:00';
  const [h, m] = reminderTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 20, m || 0, 0, 0);
  if (d < new Date()) d.setDate(d.getDate() + 1);

  const dt =
    getTodayDateString(d).replaceAll('-', '') +
    'T' +
    String(h || 20).padStart(2, '0') +
    String(m || 0).padStart(2, '0') +
    '00';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EgyNutritionistAkly//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:egy-nutri-daily-' + Date.now() + '@local',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    'DTSTART:' + dt,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:متابعة خبير التغذية وأكلي اليومية 🥗💊',
    'DESCRIPTION:سجل وجباتك، راجع الألياف وحد دهون المرارة، وخذ مكملاتك حسب موعدها.',
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:وقت متابعة أكلك ومكملاتك',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'egyptian-nutritionist-reminder.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('تم تنزيل ملف التقويم (.ics)! افتحه لإضافته لتقويم الآيفون 📅');
};

// تشخيص الخبير الذكي (يشمل استئصال المرارة + الألياف + الشغل المكتبي)
function getSmartOfficeDiagnosis(totals) {
  const t = state.profile.targets;
  const p = state.profile;
  const currLog = getCurrentDayLog();
  const alerts = [];

  if (p.gallbladderRemoved) {
    const maxSafeFat = Number(p.maxFatPerMeal || 14);
    if (totals.maxSingleMealFat > maxSafeFat) {
      alerts.push({
        type: 'danger',
        icon: '🩺',
        title: `تنبيه المرارة: وجبة دسمة تجاوزت ${maxSafeFat} جم دهون!`,
        message: `وجبة "${totals.heaviestFatMealName}" فيها ${totals.maxSingleMealFat} جم دهون دفعة واحدة! لأنك شايل المرارة، الكبد يفرز العصارة الصفراوية ببطء. الحل الآن: خذ كبسولة إنزيمات هاضمة، كُل تفاحة أو شوفان أو سلطة (ألياف ذائبة لربط الصفراء)، واشرب ماء دافئ.`,
        actionLabel: 'عرض الأكلات المريحة بدون مرارة',
        actionTab: 'foods',
        actionCategory: 'gallbladder_safe'
      });
    } else if (currLog.meals.length > 0) {
      alerts.push({
        type: 'success',
        icon: '🩺',
        title: 'حالة الهضم بعد استئصال المرارة: آمنة وممتازة 💚',
        message: `أعلى كمية دهون في صنف واحد هي ${totals.maxSingleMealFat} جم (أقل من حد الأمان ${maxSafeFat} جم/وجبة). استمر في تقسيم وجباتك وأكل الألياف الذائبة!`
      });
    }
  }

  const calRatio = totals.calories / Math.max(t.calories, 1);
  const fiberRatio = totals.fiber / Math.max(t.fiber, 1);

  if (totals.calories > 400 && fiberRatio < calRatio * 0.65) {
    alerts.push({
      type: 'warning',
      icon: '🥗',
      title: 'تنبيه نقص الألياف (مهم للمرارة والشغل المكتبي)!',
      message: `أخدت ${totals.calories} سعرة لكن الألياف ${totals.fiber.toFixed(1)} جم فقط (الهدف ${t.fiber} جم). الألياف الذائبة (فول، عدس، شوفان، خضار، فاكهة) ضرورية لامتصاص العصارة الصفراوية ومنع الخمول المكتبي!`,
      actionLabel: 'أضف رافع ألياف سريع الآن',
      actionTab: 'foods',
      actionCategory: 'إضافات'
    });
  }

  if (totals.sodium > t.sodiumMax * 0.8) {
    alerts.push({
      type: 'danger',
      icon: '🧂',
      title: 'الصوديوم والأملاح عالية في هذا اليوم!',
      message: `وصلت لـ ${totals.sodium} ملجم صوديوم. اشرب كوبايتين مية فوراً وكل خيار أو جرجير لمنع احتباس السوائل والصداع.`
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      icon: '👨‍⚕️',
      title: p.gallbladderRemoved
        ? 'نظامك مضبوط على: شغل مكتبي + شايل المرارة 🩺'
        : 'يومك بتوازن — خطوة صغيرة كل يوم 🌿',
      message: 'اختر أكلتك من المنيو المصري (أكثر من 48 أكلة شعبية وبيتية)، وحدد الوجبة (فطار • غدا • عشا • سناك) وتابع تقدمك الأسبوعي!'
    });
  }

  return alerts;
}

// نافذة اختيار الحصة والوجبة والتاريخ عند تسجيل أكلة (مثل تطبيق أكلي FITNESS-APP-GEM)
window.openLogFoodDialog = function (foodId) {
  const food = state.foodsDb.find((f) => f.id === foodId);
  if (!food) return;
  const defaultMealType = window.MEAL_TYPES.includes(food.category) ? food.category : 'غدا';

  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-white">${food.emoji || '🍽️'} تسجيل: ${food.name}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <p class="text-[11px] text-slate-300">
      الحصة القياسية: <strong>${food.serving}</strong> • ${food.calories} سعرة (${food.protein}جم بروتين • ${food.fats}جم دهون • ${food.fiber}جم ألياف)
    </p>
    ${
      state.profile.gallbladderRemoved && food.gallbladderNote
        ? `<div class="bg-sky-950/40 p-2.5 rounded-xl border border-sky-500/30 text-[11px] text-sky-200">
            🩺 <strong>للمرارة:</strong> ${food.gallbladderNote}
          </div>`
        : ''
    }
    <form onsubmit="confirmAddMealToLog(event, '${food.id}')" class="space-y-3 text-xs">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">عدد الحصص</label>
          <input id="log-dialog-qty" type="number" step="0.25" min="0.25" max="15" value="1" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2.5 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">نوع الوجبة</label>
          <select id="log-dialog-mealtype" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2.5 border border-white/15">
            ${window.MEAL_TYPES.map((m) => `<option value="${m}" ${m === defaultMealType ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">التاريخ</label>
        <input id="log-dialog-date" type="date" value="${state.selectedDate}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="flex gap-2 pt-1">
        <button type="submit" class="ios-btn flex-1 bg-emerald-500 text-slate-950 font-extrabold py-2.5 rounded-xl">＋ حفظ في يومياتي</button>
        <button type="button" onclick="closeModal()" class="ios-btn bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl">إلغاء</button>
      </div>
    </form>
  `);
};

window.confirmAddMealToLog = function (event, foodId) {
  event.preventDefault();
  const qty = Number(document.getElementById('log-dialog-qty')?.value) || 1;
  const mealType = document.getElementById('log-dialog-mealtype')?.value || 'غدا';
  const targetDate = document.getElementById('log-dialog-date')?.value || state.selectedDate;
  state.selectedDate = targetDate;
  closeModal();
  addMealToLog(foodId, qty, mealType);
};

// إضافة أكلة لسجل اليوم
window.addMealToLog = function (foodId, multiplier = 1, mealTiming = null) {
  const food = state.foodsDb.find((f) => f.id === foodId);
  if (!food) return;
  const resolvedMealType =
    mealTiming && window.MEAL_TYPES.includes(mealTiming)
      ? mealTiming
      : window.MEAL_TYPES.includes(food.category)
      ? food.category
      : 'غدا';

  const mealFat = Math.round((food.fats || 0) * Number(multiplier) * 10) / 10;
  const entry = {
    ...structuredClone(food),
    logId: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    multiplier: Number(multiplier),
    mealTiming: resolvedMealType,
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };

  const currLog = getCurrentDayLog();
  currLog.meals.unshift(entry);
  saveState();

  if (state.profile.gallbladderRemoved && mealFat > state.profile.maxFatPerMeal) {
    showToast(`⚠️ تنبيه المرارة: هذه الحصة تحتوي ${mealFat} جم دهون! يفضل تقليل الكمية أو أخذ إنزيمات هاضمة.`);
  } else {
    showToast(`تم تسجيل "${food.name}" في وجبة (${resolvedMealType}) بنجاح ✅`);
  }
  renderApp();
};

window.removeMealFromLog = function (logId) {
  const currLog = getCurrentDayLog();
  currLog.meals = currLog.meals.filter((m) => m.logId !== logId);
  saveState();
  showToast('تم حذف الوجبة من سجل اليوم');
  renderApp();
};

// ===== نافذة التعديل الشاملة (Universal Edit Modal) =====
function openModal(htmlContent) {
  let modal = document.getElementById('universal-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universal-edit-modal';
    modal.className =
      'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="glass-card w-full max-w-md p-4 border border-emerald-500/40 max-h-[90vh] overflow-y-auto space-y-3">
      ${htmlContent}
    </div>
  `;
  modal.classList.remove('hidden');
}

window.closeModal = function () {
  const modal = document.getElementById('universal-edit-modal');
  if (modal) modal.classList.add('hidden');
};

// 1. تعديل وجبة مسجلة في سجل اليوم
window.openEditLoggedMealModal = function (logId) {
  const currLog = getCurrentDayLog();
  const meal = currLog.meals.find((m) => m.logId === logId);
  if (!meal) return;
  const mult = Number(meal.multiplier || 1);
  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">✏️ تعديل بيانات الوجبة المسجلة</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveEditedLoggedMeal(event, '${meal.logId}')" class="space-y-2.5 text-xs">
      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-2">
          <label class="text-slate-300 font-bold block mb-1">اسم الوجبة</label>
          <input id="edit-log-name" type="text" value="${meal.name}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">الوجبة</label>
          <select id="edit-log-mealtype" class="w-full bg-slate-900 text-white rounded-xl px-2 py-2 border border-white/15">
            ${window.MEAL_TYPES.map((mt) => `<option value="${mt}" ${meal.mealTiming === mt ? 'selected' : ''}>${mt}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">السعرات الحرارية</label>
          <input id="edit-log-cal" type="number" step="1" value="${Math.round(meal.calories * mult)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-emerald-300 font-bold block mb-1">الألياف (جم) 🌾</label>
          <input id="edit-log-fiber" type="number" step="0.1" value="${(meal.fiber * mult).toFixed(1)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-emerald-500/40" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-sky-300 font-bold block mb-1">بروتين (جم)</label>
          <input id="edit-log-prot" type="number" step="0.5" value="${(meal.protein * mult).toFixed(1)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-amber-300 font-bold block mb-1">كارب (جم)</label>
          <input id="edit-log-carbs" type="number" step="0.5" value="${(meal.carbs * mult).toFixed(1)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-purple-300 font-bold block mb-1">دهون (جم) 🩺</label>
          <input id="edit-log-fats" type="number" step="0.5" value="${(meal.fats * mult).toFixed(1)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-purple-500/40" />
        </div>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">صوديوم / أملاح (ملجم)</label>
        <input id="edit-log-sodium" type="number" step="10" value="${Math.round((meal.sodium || 400) * mult)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="ios-btn flex-1 bg-emerald-500 text-slate-950 font-extrabold py-2.5 rounded-xl">💾 حفظ التعديل</button>
        <button type="button" onclick="closeModal()" class="ios-btn bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl">إلغاء</button>
      </div>
    </form>
  `);
};

window.saveEditedLoggedMeal = function (event, logId) {
  event.preventDefault();
  const currLog = getCurrentDayLog();
  const meal = currLog.meals.find((m) => m.logId === logId);
  if (!meal) return;
  meal.name = document.getElementById('edit-log-name').value.trim();
  meal.mealTiming = document.getElementById('edit-log-mealtype').value;
  meal.calories = Number(document.getElementById('edit-log-cal').value) || 0;
  meal.fiber = Number(document.getElementById('edit-log-fiber').value) || 0;
  meal.protein = Number(document.getElementById('edit-log-prot').value) || 0;
  meal.carbs = Number(document.getElementById('edit-log-carbs').value) || 0;
  meal.fats = Number(document.getElementById('edit-log-fats').value) || 0;
  meal.sodium = Number(document.getElementById('edit-log-sodium').value) || 0;
  meal.multiplier = 1;
  saveState();
  closeModal();
  showToast('تم تعديل بيانات الوجبة بنجاح ✅');
  renderApp();
};

// 2. تعديل أو إضافة أكلة في موسوعة الأكل المصري
window.openEditFoodDbModal = function (foodId = null) {
  const isNew = !foodId;
  const food = isNew
    ? {
        id: 'custom_food_' + Date.now(),
        name: '',
        emoji: '🍽️',
        category: 'غدا',
        restaurantHint: 'أكلتي المخصصة ★',
        serving: 'حصة متوسطة',
        calories: 350,
        protein: 20,
        carbs: 35,
        fats: 10,
        fiber: 5,
        sodium: 500,
        iron: 2.5,
        calcium: 60,
        potassium: 400,
        custom: true,
        officeImpact: 'energizing',
        gallbladderStatus: 'safe',
        gallbladderNote: 'دهون معتدلة ومناسبة لمن أزال المرارة.',
        expertTip: 'وجبة مخصصة محفوظة في قسم أكلاتي ★.'
      }
    : state.foodsDb.find((f) => f.id === foodId);

  if (!food) return;

  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">${isNew ? '➕ إضافة أكلة مخصصة (أكلاتي ★)' : '✏️ تعديل بيانات الأكلة في المنيو'}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveFoodDbItem(event, '${food.id}', ${isNew})" class="space-y-2.5 text-xs">
      <div>
        <label class="text-slate-300 font-bold block mb-1">اسم الأكلة</label>
        <input id="db-food-name" type="text" value="${food.name}" required placeholder="مثلاً: سندوتش كفتة بيتي" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">المطعم / المصدر</label>
          <input id="db-food-rest" type="text" value="${food.restaurantHint || ''}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">وصف الحصة</label>
          <input id="db-food-serving" type="text" value="${food.serving || ''}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">تصنيف الأكلة</label>
          <select id="db-food-cat" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15">
            ${['فطار', 'غدا', 'سناك', 'إضافات']
              .map((c) => `<option value="${c}" ${food.category === c ? 'selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </div>
        <div>
          <label class="text-emerald-300 font-bold block mb-1">حالة المرارة 🩺</label>
          <select id="db-food-gb-status" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-emerald-500/40">
            <option value="safe" ${food.gallbladderStatus === 'safe' ? 'selected' : ''}>🟢 آمن ومريح بدون مرارة</option>
            <option value="caution" ${food.gallbladderStatus === 'caution' ? 'selected' : ''}>🟡 بحذر (تقليل زيت/تومية)</option>
            <option value="heavy_fat" ${food.gallbladderStatus === 'heavy_fat' ? 'selected' : ''}>🔴 دسم ثقيل على المرارة</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-1.5">
        <div>
          <label class="text-slate-400 block mb-1 text-[10px]">سعرات</label>
          <input id="db-food-cal" type="number" value="${food.calories}" class="w-full bg-slate-900 text-white rounded-lg px-2 py-1.5 border border-white/15" />
        </div>
        <div>
          <label class="text-sky-300 block mb-1 text-[10px]">بروتين</label>
          <input id="db-food-prot" type="number" step="0.5" value="${food.protein}" class="w-full bg-slate-900 text-white rounded-lg px-2 py-1.5 border border-white/15" />
        </div>
        <div>
          <label class="text-emerald-300 block mb-1 text-[10px]">ألياف</label>
          <input id="db-food-fiber" type="number" step="0.1" value="${food.fiber}" class="w-full bg-slate-900 text-white rounded-lg px-2 py-1.5 border border-emerald-500/40" />
        </div>
        <div>
          <label class="text-amber-300 block mb-1 text-[10px]">كارب</label>
          <input id="db-food-carbs" type="number" step="0.5" value="${food.carbs}" class="w-full bg-slate-900 text-white rounded-lg px-2 py-1.5 border border-white/15" />
        </div>
        <div>
          <label class="text-purple-300 block mb-1 text-[10px]">دهون</label>
          <input id="db-food-fats" type="number" step="0.5" value="${food.fats}" class="w-full bg-slate-900 text-white rounded-lg px-2 py-1.5 border border-purple-500/40" />
        </div>
      </div>
      <div>
        <label class="text-emerald-300 font-bold block mb-1">🩺 ملاحظة خاصة لما بعد استئصال المرارة</label>
        <textarea id="db-food-gb-note" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${food.gallbladderNote || ''}</textarea>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">💡 نصيحة الشغل المكتبي</label>
        <textarea id="db-food-tip" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${food.expertTip || ''}</textarea>
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="ios-btn flex-1 bg-emerald-500 text-slate-950 font-extrabold py-2.5 rounded-xl">💾 حفظ في المنيو</button>
        ${
          !isNew
            ? `<button type="button" onclick="deleteFoodDbItem('${food.id}')" class="ios-btn bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-3 py-2.5 rounded-xl">حذف 🗑️</button>`
            : ''
        }
        <button type="button" onclick="closeModal()" class="ios-btn bg-slate-800 text-slate-300 font-bold px-3 py-2.5 rounded-xl">إلغاء</button>
      </div>
    </form>
  `);
};

window.saveFoodDbItem = function (event, foodId, isNew) {
  event.preventDefault();
  const fatsVal = Number(document.getElementById('db-food-fats').value) || 0;
  const updated = {
    id: foodId,
    name: document.getElementById('db-food-name').value.trim(),
    emoji: '🍽️',
    restaurantHint: document.getElementById('db-food-rest').value.trim(),
    serving: document.getElementById('db-food-serving').value.trim(),
    category: document.getElementById('db-food-cat').value,
    gallbladderStatus: document.getElementById('db-food-gb-status').value,
    calories: Number(document.getElementById('db-food-cal').value) || 0,
    protein: Number(document.getElementById('db-food-prot').value) || 0,
    fiber: Number(document.getElementById('db-food-fiber').value) || 0,
    carbs: Number(document.getElementById('db-food-carbs').value) || 0,
    fats: fatsVal,
    sodium: 500,
    iron: 2.5,
    calcium: 60,
    potassium: 400,
    custom: isNew ? true : undefined,
    officeImpact: fatsVal > 20 ? 'high-coma' : 'energizing',
    gallbladderNote: document.getElementById('db-food-gb-note').value.trim(),
    expertTip: document.getElementById('db-food-tip').value.trim()
  };

  if (isNew) {
    state.foodsDb.unshift(updated);
  } else {
    const idx = state.foodsDb.findIndex((f) => f.id === foodId);
    if (idx !== -1) state.foodsDb[idx] = { ...state.foodsDb[idx], ...updated };
  }
  saveState();
  closeModal();
  showToast(isNew ? 'تمت إضافة الأكلة في قسم (أكلاتي ★) بنجاح! 🍽️' : 'تم حفظ تعديلات الأكلة بنجاح! ✅');
  renderApp();
};

window.deleteFoodDbItem = function (foodId) {
  state.foodsDb = state.foodsDb.filter((f) => f.id !== foodId);
  saveState();
  closeModal();
  showToast('تم حذف الأكلة من المنيو');
  renderApp();
};

// 3. تعديل أو إضافة أي مكمل غذائي
window.openEditSupplementModal = function (suppId = null) {
  const isNew = !suppId;
  const supp = isNew
    ? {
        id: 'supp_' + Date.now(),
        name: '',
        dosage: 'كبسولة واحدة يومياً',
        timing: 'بعد الغداء',
        reason: 'لدعم النشاط والهضم.',
        warning: 'اشرب كوب ماء كبير.',
        icon: '💊'
      }
    : state.supplementsList.find((s) => s.id === suppId);

  if (!supp) return;

  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">${isNew ? '➕ إضافة مكمل غذائي جديد' : '✏️ تعديل بيانات المكمل الغذائي'}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveSupplementItem(event, '${supp.id}', ${isNew})" class="space-y-2.5 text-xs">
      <div>
        <label class="text-slate-300 font-bold block mb-1">اسم المكمل الغذائي</label>
        <input id="edit-supp-name" type="text" value="${supp.name}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">الجرعة</label>
          <input id="edit-supp-dosage" type="text" value="${supp.dosage}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">موعد الأخذ</label>
          <input id="edit-supp-timing" type="text" value="${supp.timing}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">الفائدة والسبب</label>
        <textarea id="edit-supp-reason" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${supp.reason || ''}</textarea>
      </div>
      <div>
        <label class="text-amber-300 font-bold block mb-1">ملاحظة / تنبيه الامتصاص</label>
        <input id="edit-supp-warning" type="text" value="${supp.warning || ''}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="ios-btn flex-1 bg-emerald-500 text-slate-950 font-extrabold py-2.5 rounded-xl">💾 حفظ المكمل</button>
        ${
          !isNew
            ? `<button type="button" onclick="deleteSupplementItem('${supp.id}')" class="ios-btn bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-3 py-2.5 rounded-xl">حذف 🗑️</button>`
            : ''
        }
        <button type="button" onclick="closeModal()" class="ios-btn bg-slate-800 text-slate-300 font-bold px-3 py-2.5 rounded-xl">إلغاء</button>
      </div>
    </form>
  `);
};

window.saveSupplementItem = function (event, suppId, isNew) {
  event.preventDefault();
  const updated = {
    id: suppId,
    name: document.getElementById('edit-supp-name').value.trim(),
    dosage: document.getElementById('edit-supp-dosage').value.trim(),
    timing: document.getElementById('edit-supp-timing').value.trim(),
    reason: document.getElementById('edit-supp-reason').value.trim(),
    warning: document.getElementById('edit-supp-warning').value.trim(),
    icon: '💊'
  };
  if (isNew) {
    state.supplementsList.push(updated);
  } else {
    const idx = state.supplementsList.findIndex((s) => s.id === suppId);
    if (idx !== -1) state.supplementsList[idx] = { ...state.supplementsList[idx], ...updated };
  }
  saveState();
  closeModal();
  showToast('تم حفظ بيانات المكمل الغذائي بنجاح ✅');
  renderApp();
};

window.deleteSupplementItem = function (suppId) {
  state.supplementsList = state.supplementsList.filter((s) => s.id !== suppId);
  saveState();
  closeModal();
  showToast('تم حذف المكمل الغذائي');
  renderApp();
};

// 4. تعديل أو إضافة منبه وتذكير
window.openEditReminderModal = function (remId = null) {
  const isNew = !remId;
  const rem = isNew
    ? {
        id: 'rem_' + Date.now(),
        title: '',
        intervalMinutes: 60,
        description: '',
        enabled: true,
        icon: '🔔'
      }
    : state.reminders.find((r) => r.id === remId);

  if (!rem) return;

  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">${isNew ? '➕ إضافة منبه متابعة جديد' : '✏️ تعديل المنبه والتذكير'}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveReminderItem(event, '${rem.id}', ${isNew})" class="space-y-2.5 text-xs">
      <div>
        <label class="text-slate-300 font-bold block mb-1">عنوان التذكير</label>
        <input id="edit-rem-title" type="text" value="${rem.title}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div>
        <label class="text-emerald-300 font-bold block mb-1">التكرار كل كام دقيقة؟</label>
        <input id="edit-rem-interval" type="number" min="5" max="720" value="${rem.intervalMinutes}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-emerald-500/40" />
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">وصف التذكير</label>
        <textarea id="edit-rem-desc" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${rem.description || ''}</textarea>
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="ios-btn flex-1 bg-emerald-500 text-slate-950 font-extrabold py-2.5 rounded-xl">💾 حفظ المنبه</button>
        ${
          !isNew
            ? `<button type="button" onclick="deleteReminderItem('${rem.id}')" class="ios-btn bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-3 py-2.5 rounded-xl">حذف 🗑️</button>`
            : ''
        }
        <button type="button" onclick="closeModal()" class="ios-btn bg-slate-800 text-slate-300 font-bold px-3 py-2.5 rounded-xl">إلغاء</button>
      </div>
    </form>
  `);
};

window.saveReminderItem = function (event, remId, isNew) {
  event.preventDefault();
  const updated = {
    id: remId,
    title: document.getElementById('edit-rem-title').value.trim(),
    intervalMinutes: Math.max(5, Number(document.getElementById('edit-rem-interval').value) || 60),
    description: document.getElementById('edit-rem-desc').value.trim(),
    enabled: true,
    icon: '🔔'
  };
  if (isNew) {
    state.reminders.push(updated);
  } else {
    const idx = state.reminders.findIndex((r) => r.id === remId);
    if (idx !== -1) state.reminders[idx] = { ...state.reminders[idx], ...updated };
  }
  saveState();
  setupReminderIntervals();
  closeModal();
  showToast('تم حفظ تعديل المنبه بنجاح 🔔');
  renderApp();
};

window.deleteReminderItem = function (remId) {
  state.reminders = state.reminders.filter((r) => r.id !== remId);
  saveState();
  setupReminderIntervals();
  closeModal();
  showToast('تم حذف المنبه');
  renderApp();
};

window.updateHabit = function (key, delta) {
  const currLog = getCurrentDayLog();
  const next = Math.max(0, (currLog[key] || 0) + delta);
  currLog[key] = next;
  saveState();
  if (delta > 0 && key === 'waterCups') {
    showToast(`عاش يا بطل! وصلت لـ ${next * 250} مل مية النهاردة 💧`);
  } else if (delta > 0 && key === 'stretchBreaks') {
    showToast('ممتاز! دقيقتين حركة بتريح القولون والظهر وتشغل الحرق 🚶‍♂️');
  }
  renderApp();
};

window.toggleSupplement = function (suppId) {
  const currLog = getCurrentDayLog();
  const current = !!currLog.supplementsTaken[suppId];
  currLog.supplementsTaken[suppId] = !current;
  saveState();
  if (!current) {
    showToast('برافو! تم تسجيل أخذ المكمل الغذائي 💊');
  }
  renderApp();
};

window.switchTab = function (tab, category = null) {
  state.activeTab = tab;
  if (category) {
    state.selectedCategory = category;
  }
  saveState();
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.selectCategory = function (catId) {
  state.selectedCategory = catId;
  saveState();
  renderApp();
};

window.handleSearchInput = function (val) {
  state.searchQuery = val;
  renderFoodListOnly();
};

// المحلل الذكي للوجبات بالعامية المصرية
async function analyzeEgyptianMealText(userText) {
  const apiKey = state.geminiApiKey?.trim();
  const gbText = state.profile.gallbladderRemoved
    ? `المستخدم "شايل المرارة" (استئصال المرارة)، والحد الأقصى الآمن للدهون في الوجبة الواحدة لديه هو ${state.profile.maxFatPerMeal} جرام فقط، وملاحظاته الصحية: "${state.profile.medicalNotes}".`
    : 'المستخدم يعمل في شغل مكتبي.';

  if (apiKey) {
    try {
      const prompt = `أنت خبير تغذية مصري متخصص في تغذية الموظفين أصحاب العمل المكتبي وما بعد استئصال المرارة.
${gbText}
المستخدم كتب هذه الوجبة أو السؤال باللهجة المصرية:
"${userText}"

قم بتحليل الوجبة بدقة وأعد النتيجة بصيغة JSON فقط بدون أي نص خارج JSON كالتالي:
{
  "mealName": "اسم واضح للوجبة",
  "serving": "تقدير الكمية",
  "calories": 500,
  "protein": 25,
  "carbs": 55,
  "fats": 14,
  "fiber": 6.5,
  "sodium": 750,
  "iron": 3.2,
  "calcium": 80,
  "potassium": 450,
  "officeImpact": "energizing أو moderate أو high-coma",
  "gallbladderStatus": "safe أو caution أو heavy_fat",
  "gallbladderNote": "تقييم مدى ملاءمة دهون هذه الوجبة لمن أزال المرارة",
  "replyText": "رد مصري ودود وعملي جداً يوضح: 1) هل الدهون في الوجبة آمنة للي شايل المرارة؟ 2) هل الألياف كافية؟ 3) نصيحة عملية فورية."
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            replyText: parsed.replyText,
            parsedMeal: {
              id: 'ai_meal_' + Date.now(),
              name: parsed.mealName || 'وجبة محللة بالذكاء الاصطناعي',
              emoji: '🍽️',
              restaurantHint: 'تحليل الخبير الذكي (Gemini AI)',
              serving: parsed.serving || 'وجبة مخصصة',
              calories: Number(parsed.calories) || 350,
              protein: Number(parsed.protein) || 15,
              carbs: Number(parsed.carbs) || 40,
              fats: Number(parsed.fats) || 12,
              fiber: Number(parsed.fiber) || 4,
              sodium: Number(parsed.sodium) || 500,
              iron: Number(parsed.iron) || 2,
              calcium: Number(parsed.calcium) || 60,
              potassium: Number(parsed.potassium) || 350,
              officeImpact: parsed.officeImpact || 'moderate',
              gallbladderStatus: parsed.gallbladderStatus || 'caution',
              gallbladderNote: parsed.gallbladderNote || '',
              expertTip: parsed.replyText
            }
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API fallback to local smart parser:', err);
    }
  }

  return localEgyptianMealParser(userText);
}

function localEgyptianMealParser(text) {
  const norm = window.normalizeArabic(text);
  const matchedFoods = [];

  for (const f of state.foodsDb) {
    const fNameNorm = window.normalizeArabic(f.name.split('(')[0]);
    const words = fNameNorm.split(' ').filter((w) => w.length >= 3);
    if (words.length > 0 && words.some((w) => norm.includes(w))) {
      if (!matchedFoods.some((m) => m.id === f.id) && matchedFoods.length < 4) {
        matchedFoods.push(f);
      }
    }
  }

  let quantityMultiplier = 1;
  if (norm.includes('ساندوتشين') || norm.includes('رغيفين') || norm.includes('2 ') || norm.includes('اتنين')) {
    quantityMultiplier = 2;
  } else if (norm.includes('3 ') || norm.includes('تلاته') || norm.includes('ثلاثه')) {
    quantityMultiplier = 3;
  } else if (norm.includes('نص ') && !norm.includes('نص فرخه')) {
    quantityMultiplier = 0.6;
  }

  if (matchedFoods.length === 0) {
    const estMeal = {
      id: 'custom_ai_' + Date.now(),
      name: text.trim().slice(0, 42),
      emoji: '🍽️',
      restaurantHint: 'تقدير الخبير الغذائي المصري',
      serving: 'وجبة متوسطة',
      calories: 420,
      protein: 18,
      carbs: 48,
      fats: 13,
      fiber: 4.5,
      sodium: 650,
      iron: 2.5,
      calcium: 65,
      potassium: 410,
      officeImpact: 'moderate',
      gallbladderStatus: 'caution',
      gallbladderNote: 'تأكد من أن تكون مطبوخة بدهون خفيفة وأضف معها سلطة أو شوفان لامتصاص العصارة الصفراوية.',
      expertTip: 'تقدر تضيفها لسجل يومك وتعدل أرقامها بحرية من زر التعديل ✏️!'
    };
    return {
      replyText: `حسبتلك تقدير غذائي لـ **"${estMeal.name}"**: حوالي **${estMeal.calories} سعرة**، **${estMeal.protein} جم بروتين**، **${estMeal.fats} جم دهون**، و **${estMeal.fiber} جم ألياف**.\n🩺 **تقييم المرارة:** طالما الدهون في حدود ${state.profile.maxFatPerMeal} جم في الوجبة الواحدة فهي مريحة للهضم.`,
      parsedMeal: estMeal
    };
  }

  const combined = matchedFoods.reduce(
    (acc, f) => {
      acc.names.push(f.name);
      acc.calories += Math.round(f.calories * quantityMultiplier);
      acc.protein += Math.round(f.protein * quantityMultiplier * 10) / 10;
      acc.carbs += Math.round(f.carbs * quantityMultiplier * 10) / 10;
      acc.fats += Math.round(f.fats * quantityMultiplier * 10) / 10;
      acc.fiber += Math.round(f.fiber * quantityMultiplier * 10) / 10;
      acc.sodium += Math.round((f.sodium || 450) * quantityMultiplier);
      acc.iron += Math.round((f.iron || 2) * quantityMultiplier * 10) / 10;
      acc.calcium += Math.round((f.calcium || 50) * quantityMultiplier);
      acc.potassium += Math.round((f.potassium || 350) * quantityMultiplier);
      if (f.officeImpact === 'high-coma') acc.officeImpact = 'high-coma';
      if (f.gallbladderStatus === 'heavy_fat') acc.gallbladderStatus = 'heavy_fat';
      else if (f.gallbladderStatus === 'caution' && acc.gallbladderStatus !== 'heavy_fat') acc.gallbladderStatus = 'caution';
      acc.tips.push(f.expertTip);
      if (f.gallbladderNote) acc.gbNotes.push(f.gallbladderNote);
      return acc;
    },
    {
      names: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sodium: 0,
      iron: 0,
      calcium: 0,
      potassium: 0,
      officeImpact: 'energizing',
      gallbladderStatus: 'safe',
      tips: [],
      gbNotes: []
    }
  );

  const mealTitle = combined.names.join(' + ') + (quantityMultiplier !== 1 ? ` (×${quantityMultiplier})` : '');
  const maxSafeFat = Number(state.profile.maxFatPerMeal || 14);
  const gbEvaluation = state.profile.gallbladderRemoved
    ? combined.fats > maxSafeFat
      ? `🔴 **تحذير هام لأنك شايل المرارة:** إجمالي الدهون في هذه الوجبة **${combined.fats} جم** (أعلى من الحد الآمن ${maxSafeFat} جم للوجبة الواحدة!). اقسم الوجبة على مرتين أو خذ إنزيمات هاضمة وألياف ذائبة.`
      : `🟢 **آمن لما بعد استئصال المرارة:** الدهون في هذه الوجبة **${combined.fats} جم** فقط (ضمن الحد الآمن ${maxSafeFat} جم/وجبة).`
    : '';

  const parsedMeal = {
    id: 'smart_parsed_' + Date.now(),
    name: mealTitle,
    emoji: '🍽️',
    restaurantHint: 'تحليل الخبير المصري الذكي',
    serving: quantityMultiplier === 1 ? 'وجبة قياسية' : `الكمية × ${quantityMultiplier}`,
    calories: combined.calories,
    protein: combined.protein,
    carbs: combined.carbs,
    fats: combined.fats,
    fiber: combined.fiber,
    sodium: combined.sodium,
    iron: combined.iron,
    calcium: combined.calcium,
    potassium: combined.potassium,
    officeImpact: combined.officeImpact,
    gallbladderStatus: combined.fats > maxSafeFat ? 'heavy_fat' : combined.gallbladderStatus,
    gallbladderNote: combined.gbNotes[0] || '',
    expertTip: combined.tips[0]
  };

  return {
    replyText: `يا بطل حللت وجبتك: **${mealTitle}** 🍽️\n• السعرات: **${combined.calories} سعرة** | البروتين: **${combined.protein} جم** | الدهون: **${combined.fats} جم** | الألياف: **${combined.fiber} جم**\n${gbEvaluation ? '• ' + gbEvaluation + '\n' : ''}• 💡 نصيحة الشغل المكتبي: ${combined.tips[0]}`,
    parsedMeal
  };
}

window.handleSendAiMessage = async function (event) {
  event.preventDefault();
  const input = document.getElementById('ai-meal-input');
  const text = input?.value?.trim();
  if (!text) return;

  input.value = '';
  state.aiHistory.push({ role: 'user', text });
  renderApp();

  const btn = document.getElementById('ai-send-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'جاري تحليل الوجبة والدهون... ⏳';
  }

  const result = await analyzeEgyptianMealText(text);
  state.aiHistory.push({
    role: 'assistant',
    text: result.replyText,
    parsedMeal: result.parsedMeal
  });
  saveState();
  renderApp();
};

window.addAiParsedMeal = function (index) {
  const item = state.aiHistory[index];
  if (!item || !item.parsedMeal) return;
  const entry = {
    ...item.parsedMeal,
    logId: 'log_ai_' + Date.now(),
    multiplier: 1,
    mealTiming: 'غدا',
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
  getCurrentDayLog().meals.unshift(entry);
  saveState();
  showToast('تمت إضافة الوجبة المحللة لسجل يومك! 🎉');
  renderApp();
};

window.saveGeminiKey = function () {
  const input = document.getElementById('gemini-api-key-input');
  if (!input) return;
  state.geminiApiKey = input.value.trim();
  saveState();
  showToast(state.geminiApiKey ? 'تم حفظ مفتاح Gemini API بنجاح! 🤖' : 'تم مسح مفتاح API والاعتماد على المحرك المحلي الذكي.');
  renderApp();
};

// حاسبة الاحتياج اليومي Mifflin-St Jeor (تجمع بين حاسبة أكلي FITNESS-APP-GEM وحالة استئصال المرارة)
window.recalculateAutoTargets = function () {
  const gender = document.getElementById('prof-gender')?.value || state.profile.gender || 'male';
  const weight = Number(document.getElementById('prof-weight')?.value) || state.profile.weight;
  const height = Number(document.getElementById('prof-height')?.value) || state.profile.height;
  const age = Number(document.getElementById('prof-age')?.value) || state.profile.age;
  const activity = document.getElementById('prof-activity')?.value || state.profile.activity || 'sedentary';
  const goal = document.getElementById('prof-goal')?.value || state.profile.goal;
  const gbRemoved = document.getElementById('prof-gb-removed')?.checked ?? state.profile.gallbladderRemoved;

  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'female' ? -161 : 5);
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[activity] || 1.28;
  let targetCal = Math.round(bmr * mult);

  if (goal === 'fat_loss') targetCal = Math.max(1200, targetCal - 400);
  if (goal === 'muscle') targetCal += 300;

  const proteinFactor = goal === 'fat_loss' ? 1.75 : 1.55;
  const protein = Math.round(weight * proteinFactor);
  const fatPct = gbRemoved ? 0.22 : 0.28;
  const fats = Math.round((targetCal * fatPct) / 9);
  const carbs = Math.max(60, Math.round((targetCal - protein * 4 - fats * 9) / 4));
  const fiber = Math.max(gbRemoved ? 30 : 25, Math.round((targetCal / 1000) * 15));
  const waterCups = Math.max(8, Math.min(20, Math.round((weight * 35) / 250)));
  const maxFatPerMeal = gbRemoved ? Math.min(15, Math.round(fats / 3.8)) : 25;

  document.getElementById('prof-cal-target').value = targetCal;
  document.getElementById('prof-prot-target').value = protein;
  document.getElementById('prof-carbs-target').value = carbs;
  document.getElementById('prof-fats-target').value = fats;
  document.getElementById('prof-fiber-target').value = fiber;
  document.getElementById('prof-water-target').value = waterCups;
  document.getElementById('prof-max-meal-fat').value = maxFatPerMeal;

  showToast('تم حساب الأهداف المقترحة! اضغط «حفظ كافة البيانات» بالأسفل لاعتمادها 🧮');
};

window.saveProfileSettings = function (event) {
  event.preventDefault();
  const name = document.getElementById('prof-name')?.value?.trim() || 'بطل الشغل المكتبي';
  const gender = document.getElementById('prof-gender')?.value || 'male';
  const weight = Number(document.getElementById('prof-weight')?.value) || 80;
  const height = Number(document.getElementById('prof-height')?.value) || 175;
  const age = Number(document.getElementById('prof-age')?.value) || 30;
  const activity = document.getElementById('prof-activity')?.value || 'sedentary';
  const workStyle = document.getElementById('prof-workstyle')?.value?.trim() || 'شغل مكتبي / ريموت';
  const foodSource = document.getElementById('prof-foodsource')?.value?.trim() || 'مطاعم وأكل شارع';
  const workStart = document.getElementById('prof-workstart')?.value || '09:00';
  const workEnd = document.getElementById('prof-workend')?.value || '18:00';
  const reminderTime = document.getElementById('prof-remindertime')?.value || '20:00';
  const goal = document.getElementById('prof-goal')?.value || 'fat_loss';
  const gallbladderRemoved = !!document.getElementById('prof-gb-removed')?.checked;
  const colonSensitive = !!document.getElementById('prof-colon-sensitive')?.checked;
  const maxFatPerMeal = Number(document.getElementById('prof-max-meal-fat')?.value) || 14;
  const medicalNotes = document.getElementById('prof-med-notes')?.value?.trim() || '';

  const calories = Number(document.getElementById('prof-cal-target')?.value) || 1900;
  const protein = Number(document.getElementById('prof-prot-target')?.value) || 135;
  const carbs = Number(document.getElementById('prof-carbs-target')?.value) || 200;
  const fats = Number(document.getElementById('prof-fats-target')?.value) || 55;
  const fiber = Number(document.getElementById('prof-fiber-target')?.value) || 32;
  const waterCups = Number(document.getElementById('prof-water-target')?.value) || 10;
  const stretchBreaks = Number(document.getElementById('prof-stretch-target')?.value) || 6;

  state.profile = {
    ...state.profile,
    name,
    gender,
    weight,
    height,
    age,
    activity,
    workStyle,
    foodSource,
    workStart,
    workEnd,
    reminderTime,
    goal,
    gallbladderRemoved,
    colonSensitive,
    maxFatPerMeal,
    medicalNotes,
    targets: {
      ...state.profile.targets,
      calories,
      protein,
      carbs,
      fats,
      fiber,
      waterCups,
      stretchBreaks
    }
  };
  saveState();
  showToast('تم حفظ ملفك الصحي ومواعيد شغلك وأهدافك بنجاح! ✅');
  renderApp();
};

// تصدير واستيراد البيانات (يدعم ملفاتنا وملفات تطبيق أكلي FITNESS-APP-GEM)
window.exportUserData = function () {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `egyptian-nutritionist-backup-${getTodayDateString()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('تم تحميل ملف النسخة الاحتياطية لبياناتك 📥');
};

window.importUserData = function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      // دعم استيراد نسخة احتياطية من تطبيق أكلي (FITNESS-APP-GEM)
      if (imported && imported.version === 1 && Array.isArray(imported.entries)) {
        imported.entries.forEach((en) => {
          const dLog = ensureDayLog(en.date || getTodayDateString());
          dLog.meals.push({
            id: en.food.id || 'akly_' + Date.now(),
            logId: en.id || 'log_' + Date.now(),
            name: en.food.name,
            emoji: en.food.emoji || '🍽️',
            serving: en.food.portion || 'حصة',
            calories: Number(en.food.calories) || 0,
            protein: Number(en.food.protein) || 0,
            carbs: Number(en.food.carbs) || 0,
            fats: Number(en.food.fat ?? en.food.fats) || 0,
            fiber: Number(en.food.fiber) || 0,
            multiplier: Number(en.quantity) || 1,
            mealTiming: en.meal || 'غدا',
            timeAdded: 'مستورد'
          });
        });
        if (imported.water) {
          Object.entries(imported.water).forEach(([dt, cups]) => {
            ensureDayLog(dt).waterCups = Number(cups) || 0;
          });
        }
        saveState();
        renderApp();
        showToast('تم استيراد بياناتك من تطبيق (أكلي) بنجاح! 🎉');
        return;
      }

      if (imported && imported.profile) {
        state = { ...state, ...imported };
        saveState();
        renderApp();
        showToast('تم استيراد كافة بياناتك وتعديلاتك بنجاح! 🎉');
      }
    } catch (err) {
      showToast('الملف غير صالح للاستيراد ❌');
    }
  };
  reader.readAsText(file);
};

window.resetDefaultDatabase = function () {
  if (!confirm('هل تريد استعادة القائمة الافتراضية للأكلات والمكملات مع الاحتفاظ بملفك الشخصي؟')) return;
  state.foodsDb = structuredClone(window.EGYPTIAN_FOODS_DB || []);
  state.supplementsList = structuredClone(window.DEFAULT_SUPPLEMENTS || []);
  state.reminders = structuredClone(window.DEFAULT_REMINDERS || []);
  saveState();
  renderApp();
  showToast('تمت استعادة البيانات الافتراضية بنجاح 🔄');
};

// التذكيرات وإشعارات الآيفون
window.toggleReminder = function (remId) {
  const rem = state.reminders.find((r) => r.id === remId);
  if (!rem) return;
  rem.enabled = !rem.enabled;
  saveState();
  setupReminderIntervals();
  showToast(rem.enabled ? `تم تفعيل تذكير: ${rem.title}` : `تم إيقاف تذكير: ${rem.title}`);
  renderApp();
};

window.requestNotificationPermission = async function () {
  if (!('Notification' in window)) {
    showToast('التنبيهات الصوتية والداخلية مفعلة تلقائياً على جهازك 🔔');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('تم تفعيل إشعارات الآيفون/المتصفح بنجاح! 🔔');
    new Notification('خبير التغذية المصري & أكلي 🥗', {
      body: 'هفكرك بمواعيد المية، تقسيم الوجبات للمرارة، والحركة والمكملات في وقتها!',
      icon: './icon.svg'
    });
  } else {
    showToast('سيتم استخدام المنبه الداخلي والصوتي داخل التطبيق 🔔');
  }
  renderApp();
};

window.triggerTestReminder = function (remId) {
  const rem = state.reminders.find((r) => r.id === remId);
  if (!rem) return;
  fireReminderAlert(rem);
};

function fireReminderAlert(rem) {
  playGentleChime();
  showToast(`${rem.icon || '🔔'} تذكير الخبير: ${rem.title}`);
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(rem.title, {
        body: rem.description,
        icon: './icon.svg'
      });
    } catch (e) {}
  }
}

function playGentleChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (e) {}
}

function setupReminderIntervals() {
  reminderTimers.forEach((t) => clearInterval(t));
  reminderTimers = [];
  state.reminders.forEach((rem) => {
    if (rem.enabled && rem.intervalMinutes > 0) {
      const timer = setInterval(() => {
        fireReminderAlert(rem);
      }, rem.intervalMinutes * 60 * 1000);
      reminderTimers.push(timer);
    }
  });
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className =
    'bg-emerald-600/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400/40 text-xs font-bold flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100';
  el.innerHTML = `<span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 300);
  }, 3400);
}

// ===== 1. واجهة Dashboard (يومي - تجمع مميزات أكلي + خبير التغذية + استئصال المرارة) =====
function renderDashboardView() {
  const currLog = getCurrentDayLog();
  const totals = getTodayTotals();
  const targets = state.profile.targets;
  const p = state.profile;
  const calPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  const fiberPct = Math.min(100, Math.round((totals.fiber / targets.fiber) * 100));
  const proteinPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
  const carbsPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
  const fatsPct = Math.min(100, Math.round((totals.fats / targets.fats) * 100));

  const prevDate = getPrevDateString(state.selectedDate);
  const prevMealsCount = state.logsByDate[prevDate]?.meals?.length || 0;

  const alerts = getSmartOfficeDiagnosis(totals);

  // تجميع الوجبات حسب النوع (فطار، غدا، عشا، سناك) مثل تطبيق أكلي + حساب دهون كل وجبة للمرارة
  const groupedMealsHtml = window.MEAL_TYPES.map((mType) => {
    const mList = currLog.meals.filter((m) => (m.mealTiming || 'غدا') === mType);
    if (!mList.length) return '';
    const groupTotals = getTotalsForMeals(mList);
    const isGroupFatHigh = p.gallbladderRemoved && groupTotals.fats > p.maxFatPerMeal;

    return `
      <div class="bg-slate-900/50 rounded-2xl p-3 border ${
        isGroupFatHigh ? 'border-rose-500/50' : 'border-white/10'
      } space-y-2">
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span class="text-xs font-extrabold text-emerald-300">🍽️ ${mType} (${mList.length})</span>
          <div class="text-[11px] text-slate-300">
            <strong>${groupTotals.calories}</strong> سعرة •
            <strong class="${isGroupFatHigh ? 'text-rose-400' : 'text-purple-300'}">${groupTotals.fats.toFixed(1)}جم دهون</strong> •
            <strong class="text-emerald-300">${groupTotals.fiber.toFixed(1)}جم ألياف</strong>
          </div>
        </div>
        ${
          isGroupFatHigh
            ? `<div class="text-[10px] bg-rose-950/40 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30">
                ⚠️ مجموع دهون وجبة (${mType}) هو ${groupTotals.fats.toFixed(1)} جم (أعلى من حد أمان المرارة ${p.maxFatPerMeal} جم للوجبة الواحدة!). قلل الحصة أو خذ إنزيمات هاضمة.
              </div>`
            : ''
        }
        <div class="space-y-2">
          ${mList
            .map((m) => {
              const mealFat = (m.fats * m.multiplier).toFixed(1);
              return `
              <div class="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 flex items-start justify-between gap-2">
                <div class="flex items-start gap-2 flex-1">
                  <span class="text-lg mt-0.5">${m.emoji || '🍽️'}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-extrabold text-white">${m.name}</span>
                      <span class="text-[10px] text-slate-400">(${m.multiplier} حصة)</span>
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                      🔥 ${Math.round(m.calories * m.multiplier)} سعرة • 🍗 ${Math.round(m.protein * m.multiplier)}ب • 🌾 <strong class="text-emerald-300">${(m.fiber * m.multiplier).toFixed(1)}ألياف</strong> • 🩺 <strong class="text-purple-300">${mealFat}دهون</strong>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button onclick="openEditLoggedMealModal('${m.logId}')" class="bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] px-2 py-1 rounded-lg font-bold" title="تعديل">
                    ✎
                  </button>
                  <button onclick="removeMealFromLog('${m.logId}')" class="bg-slate-800/60 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[11px] px-2 py-1 rounded-lg" title="حذف">
                    ×
                  </button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="space-y-4 pb-6">
      <!-- شريط الترحيب واختيار التاريخ (من تطبيق أكلي FITNESS-APP-GEM) -->
      <div class="glass-card-highlight p-4">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              💻 ${p.workStyle}
            </span>
            ${
              p.gallbladderRemoved
                ? `<span class="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-sky-400/40">
                    🩺 شايل المرارة (حد الوجبة: ${p.maxFatPerMeal}جم دهون)
                  </span>`
                : ''
            }
          </div>
          <!-- اختيار التاريخ -->
          <input
            type="date"
            value="${state.selectedDate}"
            onchange="changeSelectedDate(this.value)"
            aria-label="تاريخ اليوميات"
            class="bg-slate-900/90 text-emerald-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-emerald-500/30 focus:outline-none"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-extrabold text-white">يومك بتوازن يا ${p.name} 🌿</h2>
            <p class="text-[11px] text-slate-300 mt-0.5">${p.medicalNotes || 'كل وجبة بتسجلها بتخليك فاهم جسمك وهضمك أكتر.'}</p>
          </div>
          <button onclick="switchTab('profile')" class="ios-btn bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] px-3 py-2 rounded-xl whitespace-nowrap">
            ✏️ تعديل حالتي
          </button>
        </div>
      </div>

      <!-- ملخص السعرات والألياف -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-card p-4 relative overflow-hidden">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-xs text-slate-400 font-semibold">السعرات الحرارية</span>
              <div class="text-2xl font-extrabold text-white mt-0.5">
                ${totals.calories}
                <span class="text-xs font-normal text-slate-400">/ ${targets.calories}</span>
              </div>
            </div>
            <span class="text-xl">🔥</span>
          </div>
          <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="progress-fill h-full rounded-full ${
              totals.calories > targets.calories ? 'bg-rose-500' : 'bg-emerald-400'
            }" style="width: ${calPct}%"></div>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">
            المتبقي: <strong class="text-emerald-300">${Math.max(0, targets.calories - totals.calories)} سعرة</strong>
          </p>
        </div>

        <div class="glass-card p-4 relative overflow-hidden border ${
          totals.fiber < 15 ? 'border-amber-500/30' : 'border-emerald-500/40'
        }">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-xs text-emerald-300 font-bold">الألياف (للمرارة والشبع)</span>
              <div class="text-2xl font-extrabold text-white mt-0.5">
                ${totals.fiber.toFixed(1)}<span class="text-xs font-normal text-slate-400"> / ${targets.fiber} جم</span>
              </div>
            </div>
            <span class="text-xl">🌾</span>
          </div>
          <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="progress-fill h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500" style="width: ${fiberPct}%"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-[10px] text-slate-300">تربط العصارة الصفراوية</span>
            <button onclick="switchTab('foods', 'إضافات')" class="text-[11px] text-emerald-400 font-bold underline">
              + زود ألياف
            </button>
          </div>
        </div>
      </div>

      <!-- الماكروز + مؤشر دهون المرارة -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-slate-300">⚖️ البروتين • الكارب • الدهون</h3>
          <button onclick="switchTab('insights')" class="text-[11px] text-emerald-400 font-bold underline">📈 إحصائيات آخر 7 أيام</button>
        </div>
        <div class="grid grid-cols-3 gap-2.5 text-center">
          <div class="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <div class="text-xs text-sky-300 font-bold">بروتين 🍗</div>
            <div class="text-base font-extrabold text-white my-1">${totals.protein.toFixed(0)} <span class="text-[11px] text-slate-400">/ ${targets.protein}جم</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-sky-400 h-full rounded-full" style="width: ${proteinPct}%"></div>
            </div>
          </div>
          <div class="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <div class="text-xs text-amber-300 font-bold">كارب 🥖</div>
            <div class="text-base font-extrabold text-white my-1">${totals.carbs.toFixed(0)} <span class="text-[11px] text-slate-400">/ ${targets.carbs}جم</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-amber-400 h-full rounded-full" style="width: ${carbsPct}%"></div>
            </div>
          </div>
          <div class="bg-slate-900/60 p-2.5 rounded-xl border ${
            p.gallbladderRemoved && totals.maxSingleMealFat > p.maxFatPerMeal
              ? 'border-rose-500/60 bg-rose-950/30'
              : 'border-white/5'
          }">
            <div class="text-xs text-purple-300 font-bold">دهون 🩺</div>
            <div class="text-base font-extrabold text-white my-1">${totals.fats.toFixed(0)} <span class="text-[11px] text-slate-400">/ ${targets.fats}جم</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-purple-400 h-full rounded-full" style="width: ${fatsPct}%"></div>
            </div>
            ${
              p.gallbladderRemoved
                ? `<div class="text-[9px] mt-1 ${
                    totals.maxSingleMealFat > p.maxFatPerMeal ? 'text-rose-300 font-bold' : 'text-emerald-300'
                  }">أقصى صنف: ${totals.maxSingleMealFat} / ${p.maxFatPerMeal}جم</div>`
                : ''
            }
          </div>
        </div>
      </div>

      <!-- تشخيص الخبير الفوري -->
      <div class="space-y-2.5">
        ${alerts
          .map(
            (a) => `
          <div class="glass-card p-3.5 border-r-4 ${
            a.type === 'warning'
              ? 'border-r-amber-400 bg-amber-950/20'
              : a.type === 'danger'
              ? 'border-r-rose-500 bg-rose-950/25'
              : a.type === 'info'
              ? 'border-r-sky-400 bg-sky-950/20'
              : 'border-r-emerald-400 bg-emerald-950/20'
          }">
            <div class="flex items-start gap-2.5">
              <span class="text-xl mt-0.5">${a.icon}</span>
              <div class="flex-1">
                <h4 class="text-xs font-extrabold text-white">${a.title}</h4>
                <p class="text-xs text-slate-300 mt-1 leading-relaxed">${a.message}</p>
                ${
                  a.actionLabel
                    ? `<button onclick="switchTab('${a.actionTab}', '${a.actionCategory || 'all'}')" class="mt-2 bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <span>${a.actionLabel}</span>
                        <span>←</span>
                      </button>`
                    : ''
                }
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- وجباتك النهاردة مقسمة (فطار • غدا • عشا • سناك) + زر نسخ وجبات امبارح -->
      <div class="glass-card p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-extrabold text-white">🍽️ وجباتك المسجلة (${currLog.meals.length})</h3>
          <div class="flex items-center gap-1.5">
            ${
              currLog.meals.length === 0 && prevMealsCount > 0
                ? `<button onclick="copyYesterdayMeals()" class="ios-btn bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2.5 py-1.5 rounded-xl">
                    ↻ نسخ امبارح (${prevMealsCount})
                  </button>`
                : ''
            }
            <button onclick="switchTab('foods')" class="ios-btn bg-emerald-500 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl">
              ＋ أضف وجبة
            </button>
          </div>
        </div>

        ${
          currLog.meals.length === 0
            ? `
          <div class="text-center py-6 bg-slate-900/40 rounded-2xl border border-dashed border-slate-700">
            <div class="text-3xl mb-2">🥙🍲🍗</div>
            <p class="text-xs text-slate-300 font-semibold">لسه مفيش وجبات مسجلة في هذا اليوم.</p>
            <p class="text-[11px] text-slate-400 mt-1">الفول والطعمية والكشري والمحشي والمشويات موجودين هنا مع تقييم المرارة.</p>
            <div class="flex justify-center gap-2 mt-3">
              <button onclick="switchTab('foods', 'gallbladder_safe')" class="ios-btn bg-emerald-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl">
                💚 أكلات مريحة بدون مرارة
              </button>
              ${
                prevMealsCount > 0
                  ? `<button onclick="copyYesterdayMeals()" class="ios-btn bg-slate-800 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-500/30">
                      ↻ نسخ وجبات امبارح (${prevMealsCount})
                    </button>`
                  : `<button onclick="switchTab('ai')" class="ios-btn bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/10">
                      🤖 اكتب وجبتك بالعامية
                    </button>`
              }
            </div>
          </div>
        `
            : `<div class="space-y-3">${groupedMealsHtml}</div>`
        }
      </div>

      <!-- شرب المية (بالمللي والأكواب 250 مل) + قومة المكتب -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-card p-3.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sky-300">💧 شرب المية</span>
            <span class="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">${currLog.waterCups * 250} مل</span>
          </div>
          <div class="text-sm font-extrabold text-white mt-1">${currLog.waterCups} <span class="text-[11px] font-normal text-slate-400">/ ${targets.waterCups} أكواب (250مل)</span></div>
          <div class="flex items-center gap-2 mt-2.5">
            <button onclick="updateHabit('waterCups', 1)" class="ios-btn flex-1 bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 font-bold text-xs py-2 rounded-xl">
              ＋ كوب
            </button>
            <button onclick="updateHabit('waterCups', -1)" class="ios-btn bg-slate-800 text-slate-400 font-bold text-xs px-3 py-2 rounded-xl">
              −
            </button>
          </div>
        </div>

        <div class="glass-card p-3.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-amber-300">🚶‍♂️ حركة المكتب</span>
            <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">هضم ونشاط</span>
          </div>
          <div class="text-sm font-extrabold text-white mt-1">${currLog.stretchBreaks} <span class="text-[11px] font-normal text-slate-400">/ ${targets.stretchBreaks} فواصل حركة</span></div>
          <div class="flex items-center gap-2 mt-2.5">
            <button onclick="updateHabit('stretchBreaks', 1)" class="ios-btn flex-1 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 font-bold text-xs py-2 rounded-xl">
              ＋ قمت اتحركت
            </button>
            <button onclick="updateHabit('stretchBreaks', -1)" class="ios-btn bg-slate-800 text-slate-400 font-bold text-xs px-3 py-2 rounded-xl">
              −
            </button>
          </div>
        </div>
      </div>

      <!-- بطاقة "وسط يوم الشغل ☀️" + تذكير تقويم الآيفون (.ics) من تطبيق أكلي -->
      <div class="glass-card p-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-extrabold text-amber-300">☀️ وسط يوم الشغل (${p.workStart || '09:00'} – ${p.workEnd || '18:00'})</h3>
          <span class="text-[10px] text-slate-400">أكلك غالباً: ${p.foodSource || 'مطاعم وشارع'}</span>
        </div>
        <div class="bg-slate-900/70 p-2.5 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed">
          ${
            (p.foodSource || '').includes('بيت')
              ? 'جهّز وجبة سهلة من البيت مقسمة على حصتين قبل بداية الشغل، وسجل الكمية الفعلية.'
              : 'لو هتاكل بره أو دليفري وأنت شايل المرارة: اختار مشويات أو فول/كشري بدون تقلية، وزوّد سلطة خضراء، واطلب الطحينة أو التومية منفصلة.'
          }
        </div>
        <button
          onclick="downloadIcsCalendarReminder()"
          class="ios-btn w-full bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
        >
          <span>📅</span>
          <span>أضف تذكير يومي (${p.reminderTime || '20:00'}) لتقويم الآيفون (.ics)</span>
        </button>
      </div>
    </div>
  `;
}

// ===== 2. واجهة موسوعة الأكل المصري (تضم البحث العربي الذكي normalizeArabic + كل أكلات أكلي) =====
function getFilteredFoods() {
  const q = window.normalizeArabic(state.searchQuery);
  return state.foodsDb.filter((food) => {
    const matchCat =
      state.selectedCategory === 'all' ||
      (state.selectedCategory === 'gallbladder_safe' && food.gallbladderStatus === 'safe') ||
      (state.selectedCategory === 'custom_only' && food.custom) ||
      food.category === state.selectedCategory;
    const matchQuery =
      !q ||
      window.normalizeArabic(food.name).includes(q) ||
      window.normalizeArabic(food.serving).includes(q) ||
      window.normalizeArabic(food.restaurantHint).includes(q) ||
      window.normalizeArabic(food.gallbladderNote).includes(q);
    return matchCat && matchQuery;
  });
}

function renderFoodCardsList(foods) {
  if (foods.length === 0) {
    return `
      <div class="glass-card p-6 text-center space-y-3">
        <div class="text-3xl">🔍</div>
        <p class="text-sm font-bold text-white">مش موجودة في البحث؟</p>
        <p class="text-xs text-slate-400">اضغط «＋ أكلة مخصصة» لحفظها في قسم (أكلاتي ★) أو حللها بالخبير الذكي!</p>
        <div class="flex justify-center gap-2">
          <button onclick="openEditFoodDbModal(null)" class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl">
            ＋ أكلة مخصصة
          </button>
          <button onclick="switchTab('ai')" class="ios-btn bg-slate-800 text-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-emerald-500/30">
            🤖 حلل بالذكاء الاصطناعي
          </button>
        </div>
      </div>
    `;
  }

  return foods
    .map((food) => {
      const gbBadge =
        food.gallbladderStatus === 'safe'
          ? { label: '🟢 مريح بدون مرارة', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
          : food.gallbladderStatus === 'heavy_fat'
          ? { label: '🔴 دسم على المرارة', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
          : { label: '🟡 بحذر للمرارة', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };

      return `
    <div class="glass-card p-4 space-y-2.5">
      <div class="flex justify-between items-start gap-2">
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
              ${food.custom ? '★ أكلتي المخصصة' : '📍 ' + (food.restaurantHint || food.category)}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${gbBadge.cls}">
              ${gbBadge.label}
            </span>
          </div>
          <h4 class="text-sm font-extrabold text-white mt-1.5">${food.emoji || '🍽️'} ${food.name}</h4>
          <p class="text-[11px] text-slate-400">الحصة: ${food.serving}</p>
        </div>
        <button
          onclick="openEditFoodDbModal('${food.id}')"
          class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10"
        >
          ✏️ تعديل
        </button>
      </div>

      <div class="grid grid-cols-5 gap-1.5 bg-slate-900/75 p-2.5 rounded-xl text-center border border-white/5">
        <div>
          <div class="text-[10px] text-slate-400">سعرات</div>
          <div class="text-xs font-extrabold text-white">${food.calories}</div>
        </div>
        <div>
          <div class="text-[10px] text-sky-300">بروتين</div>
          <div class="text-xs font-extrabold text-sky-200">${food.protein}جم</div>
        </div>
        <div>
          <div class="text-[10px] text-emerald-300 font-bold">ألياف 🌾</div>
          <div class="text-xs font-extrabold text-emerald-300">${food.fiber}جم</div>
        </div>
        <div>
          <div class="text-[10px] text-amber-300">كارب</div>
          <div class="text-xs font-extrabold text-amber-200">${food.carbs}جم</div>
        </div>
        <div>
          <div class="text-[10px] text-purple-300 font-bold">دهون 🩺</div>
          <div class="text-xs font-extrabold ${
            food.fats > state.profile.maxFatPerMeal ? 'text-rose-400' : 'text-purple-200'
          }">${food.fats}جم</div>
        </div>
      </div>

      ${
        food.gallbladderNote
          ? `<div class="bg-sky-950/35 p-2.5 rounded-xl border border-sky-500/25 text-xs text-sky-100 leading-relaxed">
              <strong class="text-sky-300">🩺 للمرارة:</strong> ${food.gallbladderNote}
            </div>`
          : ''
      }

      <div class="flex items-center gap-2 pt-1">
        <button onclick="openLogFoodDialog('${food.id}')" class="ios-btn flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl shadow">
          ＋ سجل الوجبة (اختر الحصة والنوع)
        </button>
        <button onclick="addMealToLog('${food.id}', 1)" class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs px-3 py-2.5 rounded-xl border border-emerald-500/30">
          سريع +1
        </button>
      </div>
    </div>
  `;
    })
    .join('');
}

function renderFoodListOnly() {
  const container = document.getElementById('foods-list-container');
  if (container) {
    container.innerHTML = renderFoodCardsList(getFilteredFoods());
  }
}

function renderFoodsView() {
  const foods = getFilteredFoods();
  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card p-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-extrabold text-white">🥙 سجل أكلك (${state.foodsDb.length} أكلة مصرية)</h2>
            <p class="text-[11px] text-slate-300 mt-0.5">أكلات مصرية بنحبها + تقييم المرارة + تعديل وإضافة</p>
          </div>
          <button
            onclick="openEditFoodDbModal(null)"
            class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl whitespace-nowrap shadow"
          >
            ＋ أكلة مخصصة
          </button>
        </div>
        
        <div class="mt-3 relative">
          <input
            type="text"
            value="${state.searchQuery}"
            oninput="handleSearchInput(this.value)"
            placeholder="دور على فول، كشري، محشي، شاورما، جبنة، بليلة، عدس..."
            class="w-full bg-slate-900/90 text-white text-xs rounded-xl px-4 py-3 border border-white/15 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div class="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
          ${window.EGYPTIAN_FOOD_CATEGORIES.map(
            (cat) => `
            <button
              onclick="selectCategory('${cat.id}')"
              class="ios-btn whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                state.selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-900/70 text-slate-300 border-white/10'
              }"
            >
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
            </button>
          `
          ).join('')}
        </div>
      </div>

      <div id="foods-list-container" class="space-y-3">
        ${renderFoodCardsList(foods)}
      </div>
    </div>
  `;
}

// ===== 3. واجهة "متابعتي / إحصائيات آخر 7 أيام" (ميزة تطبيق أكلي FITNESS-APP-GEM) =====
function renderInsightsView() {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = getTodayDateString(d);
    const dayLog = state.logsByDate[key] || { meals: [], waterCups: 0, stretchBreaks: 0 };
    const dayTotals = getTotalsForMeals(dayLog.meals);
    return {
      key,
      label: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
      count: dayLog.meals.length,
      waterCups: dayLog.waterCups || 0,
      ...dayTotals
    };
  });

  const loggedDays = days.filter((d) => d.count > 0);
  const avgCalories = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0;
  const avgProtein = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length) : 0;
  const avgFiber = loggedDays.length ? (loggedDays.reduce((s, d) => s + d.fiber, 0) / loggedDays.length).toFixed(1) : 0;
  const avgFats = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.fats, 0) / loggedDays.length) : 0;
  const maxCal = Math.max(state.profile.targets.calories, ...days.map((d) => d.calories), 1);

  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card-highlight p-4">
        <h2 class="text-base font-extrabold text-white">📈 صورة أوضح لأسبوعك (آخر 7 أيام)</h2>
        <p class="text-xs text-slate-300 mt-0.5">متابعة السعرات، البروتين، الألياف، والدهون من تسجيلاتك الفعلية</p>
      </div>

      <!-- رسم بياني بالأعمدة لآخر 7 أيام (من تطبيق أكلي) -->
      <div class="glass-card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-extrabold text-white">📊 السعرات المسجلة خلال 7 أيام</h3>
          <span class="text-[11px] text-emerald-300 font-bold">${loggedDays.length} أيام مسجلة</span>
        </div>

        <div class="grid grid-cols-7 gap-2 items-end h-36 pt-4 px-1 bg-slate-900/60 rounded-2xl p-3 border border-white/5">
          ${days
            .map((d) => {
              const barHeight = d.count ? Math.max(12, Math.round((d.calories / maxCal) * 90)) : 4;
              const isSelected = d.key === state.selectedDate;
              return `
              <div onclick="changeSelectedDate('${d.key}'); switchTab('dashboard')" class="flex flex-col items-center cursor-pointer">
                <span class="text-[9px] text-slate-300 font-bold mb-1">${d.count ? d.calories : '—'}</span>
                <div class="w-full max-w-[26px] rounded-t-lg transition-all ${
                  isSelected
                    ? 'bg-emerald-400'
                    : d.calories > state.profile.targets.calories
                    ? 'bg-rose-400/80'
                    : 'bg-teal-500/70'
                }" style="height: ${barHeight}px"></div>
                <span class="text-[10px] mt-1.5 font-bold ${isSelected ? 'text-emerald-300 underline' : 'text-slate-400'}">${d.label}</span>
              </div>
            `;
            })
            .join('')}
        </div>
        <p class="text-[11px] text-slate-400">اضغط على أي يوم في الرسم البياني لفتح سجله أو تعديل وجباته.</p>
      </div>

      <!-- متوسطات الأسبوع -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-card p-3.5">
          <span class="text-[11px] text-slate-400">متوسط السعرات / يوم مسجل</span>
          <div class="text-xl font-extrabold text-white mt-1">${avgCalories} <span class="text-xs font-normal text-slate-400">سعرة</span></div>
          <span class="text-[10px] text-emerald-300">الهدف: ${state.profile.targets.calories} سعرة</span>
        </div>
        <div class="glass-card p-3.5">
          <span class="text-[11px] text-slate-400">متوسط الألياف / يوم مسجل 🌾</span>
          <div class="text-xl font-extrabold text-emerald-300 mt-1">${avgFiber} <span class="text-xs font-normal text-slate-400">جم</span></div>
          <span class="text-[10px] text-slate-300">الهدف: ${state.profile.targets.fiber} جم</span>
        </div>
        <div class="glass-card p-3.5">
          <span class="text-[11px] text-slate-400">متوسط البروتين / يوم مسجل 🍗</span>
          <div class="text-xl font-extrabold text-sky-300 mt-1">${avgProtein} <span class="text-xs font-normal text-slate-400">جم</span></div>
          <span class="text-[10px] text-slate-300">الهدف: ${state.profile.targets.protein} جم</span>
        </div>
        <div class="glass-card p-3.5">
          <span class="text-[11px] text-slate-400">متوسط الدهون / يوم مسجل 🩺</span>
          <div class="text-xl font-extrabold text-purple-300 mt-1">${avgFats} <span class="text-xs font-normal text-slate-400">جم</span></div>
          <span class="text-[10px] text-slate-300">الهدف: ${state.profile.targets.fats} جم</span>
        </div>
      </div>

      <div class="glass-card p-4 space-y-2">
        <h3 class="text-xs font-extrabold text-emerald-300">💡 توصية المتابعة الأسبوعية لما بعد المرارة والشغل المكتبي</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          نوّع على مدار الأسبوع بين البقول المدمسة جيداً (فول، عدس)، الخضار الورقي والمطبوخ (ملوخية، بامية، سلطة بلدي)، الفاكهة الغنية بالبكتين (تفاح، جوافة)، ومصادر البروتين المشوية (سمك مشوي، صدور فراخ، جبنة قريش، بيض مسلوق) للحفاظ على راحة الجهاز الهضمي وثبات النشاط في الشغل.
        </p>
      </div>
    </div>
  `;
}

// ===== 4. واجهة الخبير الذكي (AI Nutritionist) =====
function renderAiExpertView() {
  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card-highlight p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-extrabold text-white flex items-center gap-2">
            <span>🤖</span>
            <span>الخبير الذكي (مضبوط للمرارة والشغل)</span>
          </h2>
          <span class="text-[10px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30">
            🩺 يراقب دهون الوجبة
          </span>
        </div>
        <p class="text-xs text-slate-300 mt-1">
          اكتب أي أكلة أكلتها أو ناوي تطلبها دليفري، وهحسبلك فوراً هل كمية الدهون فيها آمنة للي شايل المرارة (أقل من ${state.profile.maxFatPerMeal} جم دهون)، وهقولك إزاي تعدلها وتضيفها لسجل يومك!
        </p>
      </div>

      <form onsubmit="handleSendAiMessage(event)" class="glass-card p-3.5 space-y-2.5">
        <label class="block text-xs font-bold text-emerald-300">✍️ احكيلي أكلت إيه أو ناوي تطلب إيه؟</label>
        <textarea
          id="ai-meal-input"
          rows="2"
          placeholder="مثال: فطرت طبق فول بالبيض المسلوق ورغيف بلدي وجرجير..."
          class="w-full bg-slate-900/90 text-white text-xs rounded-xl p-3 border border-white/15 focus:outline-none focus:border-emerald-400"
        ></textarea>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="document.getElementById('ai-meal-input').value='فطرت فول مدمس وبيض مسلوق وعيش بلدي ردة'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🥙 فول وبيض مسلوق
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='اتغديت فراخ مشوية صدر مع أرز مصري وسلطة خضراء'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🍗 فراخ مشوية وأرز
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='كلت رغيف حواوشي بلدي ومكرونة بالبشاميل'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🌭 اختبار وجبة دسمة للمرارة
          </button>
        </div>
        <button
          id="ai-send-btn"
          type="submit"
          class="ios-btn w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg"
        >
          🔍 حلل الوجبة وافحص أمان الدهون للمرارة
        </button>
      </form>

      <div class="space-y-3">
        ${state.aiHistory
          .map(
            (msg, idx) => `
          <div class="${
            msg.role === 'user'
              ? 'bg-emerald-600/25 border border-emerald-500/30 mr-6'
              : 'glass-card ml-2'
          } p-3.5 rounded-2xl">
            <div class="text-[11px] font-bold ${
              msg.role === 'user' ? 'text-emerald-300' : 'text-sky-300'
            } mb-1">
              ${msg.role === 'user' ? '👤 أنت' : '👨‍⚕️ الخبير الغذائي المصري'}
            </div>
            <div class="text-xs text-slate-100 whitespace-pre-line leading-relaxed">${msg.text}</div>
            ${
              msg.parsedMeal
                ? `
              <div class="mt-3 bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs font-extrabold text-emerald-300">${msg.parsedMeal.name}</span>
                  <span class="text-[11px] text-slate-400">${msg.parsedMeal.serving}</span>
                </div>
                <div class="grid grid-cols-5 gap-1 text-center text-[11px] bg-slate-900 p-2 rounded-lg">
                  <div><span class="text-slate-400 block text-[9px]">سعرات</span><strong>${msg.parsedMeal.calories}</strong></div>
                  <div><span class="text-sky-300 block text-[9px]">بروتين</span><strong>${msg.parsedMeal.protein}جم</strong></div>
                  <div><span class="text-emerald-300 block text-[9px]">ألياف</span><strong>${msg.parsedMeal.fiber}جم</strong></div>
                  <div><span class="text-amber-300 block text-[9px]">كارب</span><strong>${msg.parsedMeal.carbs}جم</strong></div>
                  <div><span class="text-purple-300 block text-[9px]">دهون 🩺</span><strong class="${msg.parsedMeal.fats > state.profile.maxFatPerMeal ? 'text-rose-400' : 'text-purple-300'}">${msg.parsedMeal.fats}جم</strong></div>
                </div>
                <button
                  onclick="addAiParsedMeal(${idx})"
                  class="ios-btn mt-2.5 w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs py-2 rounded-xl"
                >
                  + أضف هذه الوجبة لسجل يومي الآن
                </button>
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <div class="glass-card p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-extrabold text-white">🔑 ربط Google Gemini API (اختياري)</h4>
          <span class="text-[10px] ${
            state.geminiApiKey ? 'text-emerald-400' : 'text-amber-300'
          } font-bold">
            ${state.geminiApiKey ? 'متصل بـ Gemini AI ✅' : 'يعمل بالمحرك المصري المحلي الذكي ⚡'}
          </span>
        </div>
        <div class="flex gap-2">
          <input
            id="gemini-api-key-input"
            type="password"
            value="${state.geminiApiKey}"
            placeholder="AIzaSy..."
            class="flex-1 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15"
          />
          <button onclick="saveGeminiKey()" class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs px-4 py-2 rounded-xl border border-emerald-500/30">
            حفظ
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== 5. واجهة المكملات الغذائية والمنبهات وتقويم الآيفون (.ics) =====
function renderSupplementsAndRemindersView() {
  const currLog = getCurrentDayLog();
  const allSupps = state.supplementsList;
  const takenCount = allSupps.filter((s) => currLog.supplementsTaken[s.id]).length;

  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card-highlight p-4 flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-white">💊 مكملات المرارة والشغل (قابلة للتعديل)</h2>
          <p class="text-xs text-slate-300 mt-0.5">
            أخدت <strong class="text-emerald-300">${takenCount} من ${allSupps.length}</strong> مكملات في هذا اليوم
          </p>
        </div>
        <button
          onclick="openEditSupplementModal(null)"
          class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow"
        >
          ➕ إضافة مكمل
        </button>
      </div>

      <div class="space-y-2.5">
        ${allSupps
          .map((supp) => {
            const isTaken = !!currLog.supplementsTaken[supp.id];
            return `
            <div class="glass-card p-3.5 border ${
              isTaken ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-white/10'
            }">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2.5 flex-1">
                  <button
                    onclick="toggleSupplement('${supp.id}')"
                    class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border text-sm font-bold ${
                      isTaken
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'bg-slate-900 border-slate-600 text-transparent'
                    }"
                  >
                    ✓
                  </button>
                  <div class="flex-1">
                    <div class="flex items-center gap-1.5">
                      <span>${supp.icon || '💊'}</span>
                      <h4 class="text-xs font-extrabold ${
                        isTaken ? 'line-through text-slate-400' : 'text-white'
                      }">${supp.name}</h4>
                    </div>
                    <div class="text-[11px] text-emerald-300 font-semibold mt-0.5">
                      ⏰ ${supp.timing} • الجرعة: ${supp.dosage}
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1">${supp.reason}</p>
                    ${supp.warning ? `<p class="text-[10px] text-amber-300/90 mt-1">⚠️ ${supp.warning}</p>` : ''}
                  </div>
                </div>
                <button
                  onclick="openEditSupplementModal('${supp.id}')"
                  class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10"
                >
                  ✏️ تعديل
                </button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>

      <div class="glass-card p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-white">🔔 منبهات المتابعة وتقويم الآيفون</h3>
            <p class="text-[11px] text-slate-400">منبهات داخلية + ملف تذكير تقويم الآيفون (.ics)</p>
          </div>
          <div class="flex gap-1.5">
            <button
              onclick="openEditReminderModal(null)"
              class="ios-btn bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] px-2.5 py-2 rounded-xl"
            >
              ➕ منبه جديد
            </button>
            <button
              onclick="requestNotificationPermission()"
              class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-[11px] px-2.5 py-2 rounded-xl"
            >
              تفعيل الإشعارات
            </button>
          </div>
        </div>

        <button
          onclick="downloadIcsCalendarReminder()"
          class="ios-btn w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs py-2.5 rounded-xl"
        >
          📅 تنزيل تذكير يومي لتقويم الآيفون (.ics) في الساعة ${state.profile.reminderTime || '20:00'}
        </button>

        <div class="space-y-2.5">
          ${state.reminders
            .map(
              (rem) => `
            <div class="bg-slate-900/75 p-3 rounded-2xl border border-white/10 flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs font-bold text-white">${rem.title}</span>
                  <span class="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-md">كل ${rem.intervalMinutes} دقيقة</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">${rem.description}</p>
              </div>
              <div class="flex flex-col gap-1">
                <div class="flex gap-1">
                  <button
                    onclick="openEditReminderModal('${rem.id}')"
                    class="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2 py-1 rounded-lg font-bold"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onclick="toggleReminder('${rem.id}')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      rem.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }"
                  >
                    ${rem.enabled ? 'مفعل' : 'متوقف'}
                  </button>
                </div>
                <button
                  onclick="triggerTestReminder('${rem.id}')"
                  class="text-[10px] bg-slate-800/70 hover:bg-slate-700 text-slate-300 py-1 rounded-lg text-center"
                >
                  تجربة التنبيه 🔔
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

// ===== 6. واجهة الملف الشخصي والحاسبة وإعدادات يوم الشغل والمرارة =====
function renderProfileView() {
  const p = state.profile;
  const t = p.targets;
  return `
    <div class="space-y-4 pb-6">
      <form onsubmit="saveProfileSettings(event)" class="glass-card p-4 space-y-3.5">
        <div class="border-b border-white/10 pb-2.5">
          <h2 class="text-base font-extrabold text-white">⚙️ إعداداتي وحالتي الصحية (قابلة للتعديل)</h2>
          <p class="text-[11px] text-emerald-300">حاسبة الاحتياج + مواعيد الشغل + إعدادات استئصال المرارة</p>
        </div>

        <!-- يومك عامل إزاي؟ (من تطبيق أكلي FITNESS-APP-GEM) -->
        <div class="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
          <h3 class="text-xs font-extrabold text-amber-300">☀️ يومك وشغلك عامل إزاي؟</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">اسمك</label>
              <input id="prof-name" type="text" value="${p.name}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">طبيعة الشغل</label>
              <input id="prof-workstyle" type="text" value="${p.workStyle}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
          </div>
          <div>
            <label class="text-[11px] text-slate-300 font-bold block mb-1">أكلك غالباً منين؟</label>
            <input id="prof-foodsource" type="text" value="${p.foodSource || 'مطاعم وأكل شارع'}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">بداية الشغل</label>
              <input id="prof-workstart" type="time" value="${p.workStart || '09:00'}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">نهاية الشغل</label>
              <input id="prof-workend" type="time" value="${p.workEnd || '18:00'}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[10px] text-emerald-300 font-bold block mb-1">تذكير التقويم</label>
              <input id="prof-remindertime" type="time" value="${p.reminderTime || '20:00'}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-emerald-500/40" />
            </div>
          </div>
        </div>

        <!-- حاسبة الاحتياج التقريبي Mifflin-St Jeor -->
        <div class="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold text-emerald-300">🧮 بيانات الجسم وحاسبة الاحتياج</h3>
            <button
              type="button"
              onclick="recalculateAutoTargets()"
              class="ios-btn bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg"
            >
              احسب واملأ الأهداف ↓
            </button>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">النوع</label>
              <select id="prof-gender" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15">
                <option value="male" ${p.gender !== 'female' ? 'selected' : ''}>ذكر</option>
                <option value="female" ${p.gender === 'female' ? 'selected' : ''}>أنثى</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">الوزن (كجم)</label>
              <input id="prof-weight" type="number" step="0.5" value="${p.weight}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">الطول (سم)</label>
              <input id="prof-height" type="number" value="${p.height}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 font-bold block mb-1">السن</label>
              <input id="prof-age" type="number" value="${p.age}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">النشاط اليومي</label>
              <select id="prof-activity" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15">
                <option value="sedentary" ${p.activity === 'sedentary' ? 'selected' : ''}>مكتبي / حركة قليلة</option>
                <option value="light" ${p.activity === 'light' ? 'selected' : ''}>حركة خفيفة / مشي بسيط</option>
                <option value="moderate" ${p.activity === 'moderate' ? 'selected' : ''}>شغل ميداني / تمرين 3-4 أيام</option>
                <option value="active" ${p.activity === 'active' ? 'selected' : ''}>مجهود بدني عالي يومياً</option>
              </select>
            </div>
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">الهدف</label>
              <select id="prof-goal" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2 py-2 border border-white/15">
                <option value="fat_loss" ${p.goal === 'fat_loss' ? 'selected' : ''}>نزول الوزن وخسارة الكرش</option>
                <option value="maintain" ${p.goal === 'maintain' ? 'selected' : ''}>الحفاظ على الوزن وتنظيم الأكل</option>
                <option value="muscle" ${p.goal === 'muscle' ? 'selected' : ''}>زيادة الكتلة العضلية</option>
              </select>
            </div>
          </div>
        </div>

        <!-- قسم الحالة الطبية (استئصال المرارة والقولون) -->
        <div class="bg-sky-950/30 p-3.5 rounded-2xl border border-sky-500/30 space-y-2.5">
          <h3 class="text-xs font-extrabold text-sky-300">🩺 الحالة الصحية والهضمية (قابلة للتعديل)</h3>

          <label class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-white/10 cursor-pointer">
            <div>
              <span class="text-xs font-extrabold text-white block">شايل المرارة (استئصال المرارة)</span>
              <span class="text-[10px] text-slate-400">يفعّل مراقب دهون الوجبة الواحدة ونصائح العصارة الصفراوية</span>
            </div>
            <input id="prof-gb-removed" type="checkbox" ${p.gallbladderRemoved ? 'checked' : ''} class="w-5 h-5 accent-emerald-500 rounded" />
          </label>

          <label class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-white/10 cursor-pointer">
            <div>
              <span class="text-xs font-extrabold text-white block">حساسية القولون / انتفاخات مع الجلوس</span>
              <span class="text-[10px] text-slate-400">يركز على الألياف الذائبة وتجنب المقليات والتسبيك</span>
            </div>
            <input id="prof-colon-sensitive" type="checkbox" ${p.colonSensitive ? 'checked' : ''} class="w-5 h-5 accent-emerald-500 rounded" />
          </label>

          <div>
            <label class="text-xs text-sky-300 font-bold block mb-1">الحد الأقصى الآمن للدهون في الوجبة الواحدة (جم)</label>
            <input id="prof-max-meal-fat" type="number" step="1" value="${p.maxFatPerMeal}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-sky-500/40" />
          </div>

          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">ملاحظاتك الصحية الخاصة</label>
            <textarea id="prof-med-notes" rows="2" class="w-full bg-slate-900 text-white text-xs rounded-xl p-2.5 border border-white/15">${p.medicalNotes || ''}</textarea>
          </div>
        </div>

        <!-- الأهداف اليومية القابلة للتعديل -->
        <div class="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
          <h3 class="text-xs font-extrabold text-emerald-300">🎯 أهدافك اليومية (قابلة للتعديل اليدوي)</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">السعرات اليومية 🔥</label>
              <input id="prof-cal-target" type="number" value="${t.calories}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-emerald-300 font-bold block mb-1">الألياف اليومية (جم) 🌾</label>
              <input id="prof-fiber-target" type="number" value="${t.fiber}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-emerald-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[11px] text-sky-300 font-bold block mb-1">البروتين (جم)</label>
              <input id="prof-prot-target" type="number" value="${t.protein}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-amber-300 font-bold block mb-1">الكارب (جم)</label>
              <input id="prof-carbs-target" type="number" value="${t.carbs}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-purple-300 font-bold block mb-1">الدهون اليومية (جم)</label>
              <input id="prof-fats-target" type="number" value="${t.fats}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-purple-500/40" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-sky-300 font-bold block mb-1">أكواب الماء (250 مل) 💧</label>
              <input id="prof-water-target" type="number" value="${t.waterCups}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-amber-300 font-bold block mb-1">فواصل حركة المكتب 🚶‍♂️</label>
              <input id="prof-stretch-target" type="number" value="${t.stretchBreaks}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
          </div>
        </div>

        <button type="submit" class="ios-btn w-full bg-emerald-500 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg">
          💾 حفظ كافة الإعدادات والبيانات
        </button>
      </form>

      <!-- التذكيرات والنسخ الاحتياطي -->
      <div class="glass-card p-4 space-y-2.5">
        <h3 class="text-xs font-extrabold text-white">📂 التذكيرات والنسخ الاحتياطي</h3>
        <button onclick="downloadIcsCalendarReminder()" class="ios-btn w-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold py-2.5 rounded-xl border border-amber-500/30">
          📅 تنزيل تذكير يومي لتقويم الآيفون (.ics)
        </button>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="exportUserData()" class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold py-2.5 rounded-xl border border-emerald-500/30">
            📥 تصدير بياناتي (JSON)
          </button>
          <label class="ios-btn bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold py-2.5 rounded-xl border border-sky-500/30 text-center cursor-pointer">
            📤 استرجاع نسخة (أو أكلي)
            <input type="file" accept=".json" onchange="importUserData(event)" class="hidden" />
          </label>
        </div>
        <button onclick="resetDefaultDatabase()" class="w-full text-[11px] text-slate-400 hover:text-rose-300 py-1.5">
          🔄 استعادة قائمة الأكلات والمكملات الافتراضية
        </button>
      </div>
    </div>
  `;
}

function renderApp() {
  const main = document.getElementById('app-main-content');
  if (!main) return;

  if (state.activeTab === 'dashboard') {
    main.innerHTML = renderDashboardView();
  } else if (state.activeTab === 'foods') {
    main.innerHTML = renderFoodsView();
  } else if (state.activeTab === 'insights') {
    main.innerHTML = renderInsightsView();
  } else if (state.activeTab === 'ai') {
    main.innerHTML = renderAiExpertView();
  } else if (state.activeTab === 'supplements') {
    main.innerHTML = renderSupplementsAndRemindersView();
  } else if (state.activeTab === 'profile') {
    main.innerHTML = renderProfileView();
  }

  document.querySelectorAll('[data-tab-btn]').forEach((btn) => {
    const tab = btn.getAttribute('data-tab-btn');
    if (tab === state.activeTab) {
      btn.classList.add('text-emerald-400');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('text-emerald-400');
      btn.classList.add('text-slate-400');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  renderApp();
  setupReminderIntervals();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registration optional:', err);
    });
  }
});
