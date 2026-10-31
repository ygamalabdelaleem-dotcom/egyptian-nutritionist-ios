// المنطق الشامل لتطبيق "خبير التغذية المصري & أكلي" - يجمع مميزات FITNESS-APP-GEM + الشغل المكتبي + استئصال المرارة + الذكاء الاصطناعي + التعديل الكامل

const STORAGE_KEY = 'egy_nutritionist_state_v3';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTodayDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPrevDateString(currDateStr) {
  const [y, m, d] = currDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getTodayDateString(dt);
}

window.DIGESTION_STATES = [
  {
    id: 'normal',
    label: 'عادي ومريح',
    icon: '🟢',
    shortDesc: 'الإخراج منتظم والهضم مستقر',
    systemNote: 'استمر على توازن الألياف الذائبة وتقسيم الدهون وشرب الماء.'
  },
  {
    id: 'constipation',
    label: 'إمساك',
    icon: '🟠',
    shortDesc: 'صعوبة أو بطء في الإخراج',
    systemNote: 'يرفع النظام أولوية الألياف الملينة (سلطة، شوفان، بليلة، خضار، فاكهة) ويزيد هدف الماء والحركة.'
  },
  {
    id: 'diarrhea',
    label: 'إسهال / ليونة',
    icon: '🔴',
    shortDesc: 'إسهال أو ليونة (شائع مع العصارة الصفراوية)',
    systemNote: 'يقلل النظام حد دهون الوجبة ويرشح أكلات ممسكة ولطيفة تمتص الصفراء (تفاح، موز، أرز، بطاطس مسلوقة، شوفان، صدور دجاج).'
  },
  {
    id: 'bloating',
    label: 'انتفاخ وغازات',
    icon: '🟡',
    shortDesc: 'غازات أو تقلصات قولون مع الجلوس',
    systemNote: 'يستبعد النظام البقول الثقيلة والمسبكات ويرشح المشويات، الزبادي، الأرز، والينسون والنعناع.'
  }
];

window.MOOD_STATES = [
  {
    id: 'active',
    label: 'نشيط ومركز',
    icon: '🤩',
    shortDesc: 'طاقة ذهنية وبدنية ممتازة',
    systemNote: 'حافظ على وجبات خفيفة متوازنة البروتين والكارب المعقد لاستمرار التركيز.'
  },
  {
    id: 'normal',
    label: 'عادي وهادئ',
    icon: '🙂',
    shortDesc: 'حالة نفسية مستقرة',
    systemNote: 'توزيع الوجبات كل 4 ساعات يحمي من هبوط السكر المفاجئ.'
  },
  {
    id: 'lethargic',
    label: 'خمول وإرهاق',
    icon: '😴',
    shortDesc: 'كسل أو نعاس أو قلة تركيز في الشغل',
    systemNote: 'يركز النظام على أكلات ترفع الحديد والطاقة بدون تخمة (بيض، بليلة، سمك، تمر، فاكهة) ويمنع الأكلات المسببة للنعاس.'
  },
  {
    id: 'sad',
    label: 'حزين / متضايق',
    icon: '😔',
    shortDesc: 'مزاج متعكر أو ضيق نفسي',
    systemNote: 'يرشح النظام أكلات ترفع السيروتونين والدوبامين طبيعياً (أوميجا 3 في السمك والتونة، التربتوفان والماغنيسيوم في الموز والشوفان والبليلة).'
  },
  {
    id: 'stressed',
    label: 'متوتر ومضغوط',
    icon: '🤯',
    shortDesc: 'ضغط شغل وتوتر عصبي يؤثر على القولون',
    systemNote: 'يرشح النظام أكلات غنية بالبوتاسيوم والماغنيسيوم لتهدئة الأعصاب والقولون وتجنب الموالح العالية.'
  }
];

const DEFAULT_STATE = {
  selectedDate: getTodayDateString(),
  activeTab: 'dashboard', // 'dashboard' | 'foods' | 'ai' | 'insights' | 'supplements' | 'profile'
  selectedCategory: 'all',
  searchQuery: '',
  suggestionFilter: 'auto', // 'auto' | 'فطار' | 'غدا' | 'عشا' | 'سناك' | 'plan'
  pendingAiImage: null,
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
    digestionStatus: 'normal', // 'normal' | 'constipation' | 'diarrhea' | 'bloating'
    moodStatus: 'normal', // 'active' | 'normal' | 'lethargic' | 'sad' | 'stressed'
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
      text: 'أهلاً بك يا بطل! 👨‍💻🩺 أنا **خبيرك الغذائي المصري الذكي (بدون API Key)**:\n• 📸 **صوّر طبقك بالكاميرا أو ارفع صورته** وهحسبلك السعرات والبروتين والدهون والألياف والمعادن وأمان المرارة فوراً!\n• 💬 **كلمني في أي وقت** عن أكلك، أو لو عندك (إمساك / إسهال / انتفاخ) أو حاسس بـ (خمول / حزن / توتر في الشغل) وهقولك تاكل إيه بالظبط.',
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
      supplementsTaken: {},
      digestionStatus: state.profile?.digestionStatus || 'normal',
      moodStatus: state.profile?.moodStatus || 'normal'
    };
  }
  return state.logsByDate[dateStr];
}

function getCurrentDayLog() {
  return ensureDayLog(state.selectedDate || getTodayDateString());
}

function getActiveDigestionStatus() {
  const currLog = getCurrentDayLog();
  return currLog.digestionStatus || state.profile.digestionStatus || 'normal';
}

function getActiveMoodStatus() {
  const currLog = getCurrentDayLog();
  return currLog.moodStatus || state.profile.moodStatus || 'normal';
}

window.updateDigestionStatus = function (statusId) {
  const currLog = getCurrentDayLog();
  currLog.digestionStatus = statusId;
  state.profile.digestionStatus = statusId;
  saveState();
  const st = window.DIGESTION_STATES.find((d) => d.id === statusId);
  if (st) {
    showToast(`${st.icon} تم تحديث حالة الإخراج إلى (${st.label}) وتعديل اقتراحات الأكل والنظام!`);
  }
  renderApp();
};

window.updateMoodStatus = function (moodId) {
  const currLog = getCurrentDayLog();
  currLog.moodStatus = moodId;
  state.profile.moodStatus = moodId;
  saveState();
  const m = window.MOOD_STATES.find((x) => x.id === moodId);
  if (m) {
    showToast(`${m.icon} تم تحديث حالتك النفسية إلى (${m.label}) وتكييف التوصيات الغذائية!`);
  }
  renderApp();
};

window.setSuggestionFilter = function (filterVal) {
  state.suggestionFilter = filterVal;
  renderApp();
};

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

    let mergedFoodsDb = base.foodsDb;
    if (Array.isArray(parsed.foodsDb) && parsed.foodsDb.length > 0) {
      const existingIds = new Set(parsed.foodsDb.map((f) => f.id));
      const newDefaultFoods = base.foodsDb.filter((f) => !existingIds.has(f.id));
      mergedFoodsDb = [...newDefaultFoods, ...parsed.foodsDb].map((f) => {
        if (!f.emoji || String(f.emoji).includes('треугольник')) {
          return { ...f, emoji: '🌯' };
        }
        return f;
      });
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
      foodsDb: mergedFoodsDb,
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
  const list = mealsArray || [];
  const fatByMealTiming = {};
  const baseTotals = list.reduce(
    (acc, item) => {
      const m = Number(item.multiplier || 1);
      const mealFat = Math.round((item.fats ?? item.fat ?? 0) * m * 10) / 10;
      const timing = item.mealTiming || 'غدا';
      fatByMealTiming[timing] = Math.round(((fatByMealTiming[timing] || 0) + mealFat) * 10) / 10;

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
      heaviestFatMealName: '',
      maxMealGroupFat: 0,
      heaviestMealGroupName: '',
      effectiveMaxMealFat: 0
    }
  );

  Object.entries(fatByMealTiming).forEach(([timing, totalFat]) => {
    if (totalFat > baseTotals.maxMealGroupFat) {
      baseTotals.maxMealGroupFat = totalFat;
      baseTotals.heaviestMealGroupName = timing;
    }
  });
  baseTotals.effectiveMaxMealFat = Math.max(baseTotals.maxSingleMealFat, baseTotals.maxMealGroupFat);
  return baseTotals;
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

// تشخيص الخبير الذكي (يشمل استئصال المرارة + حالة الإخراج + الحالة النفسية + الألياف + الشغل المكتبي)
function getSmartOfficeDiagnosis(totals) {
  const t = state.profile.targets;
  const p = state.profile;
  const currLog = getCurrentDayLog();
  const digStatus = getActiveDigestionStatus();
  const moodStatus = getActiveMoodStatus();
  const alerts = [];

  // 1. تشخيص حالة الإخراج والربط المباشر بالنظام
  if (digStatus === 'diarrhea') {
    alerts.push({
      type: 'danger',
      icon: '🔴',
      title: 'بروتوكول الطوارئ للإسهال / ليونة الإخراج (مرتبط بالمرارة):',
      message:
        'في حالة الإسهال (خاصة بعد استئصال المرارة بسبب نزول العصارة الصفراوية)، تم خفض حد الدهون المقترح في الوجبة إلى 9 جم فقط. ركّز فوراً على الألياف الذائبة القابضة للسوائل (تفاح، موز، شوفان، أرز أبيض مسلوق، بطاطس مسلوقة، صدور فراخ مشوية) وتجنب اللبن الحليب والمقليات والشطة.',
      actionLabel: 'استشر الخبير الذكي عن الإسهال',
      actionTab: 'ai'
    });
  } else if (digStatus === 'constipation') {
    alerts.push({
      type: 'warning',
      icon: '🟠',
      title: 'بروتوكول علاج الإمساك وتنشيط حركة الأمعاء:',
      message: `بسبب تسجيل حالة (إمساك)، يحتاج جسمك اليوم إلى ${t.waterCups + 2} أكواب ماء على الأقل مع أكلات ملينة طبيعية غنية بالألياف (طبق سلطة خضراء كبير، بليلة قمح، شوفان، خضار سوتيه، برتقال أو جوافة، وشوربة عدس أو فول مدمس) مع القيام للتمشية كل ساعة.`,
      actionLabel: 'أضف سلطة أو شوفان الآن',
      actionTab: 'foods',
      actionCategory: 'إضافات'
    });
  } else if (digStatus === 'bloating') {
    alerts.push({
      type: 'warning',
      icon: '🟡',
      title: 'بروتوكول تهدئة الانتفاخ والقولون مع الجلوس المكتبي:',
      message:
        'لتهدئة الغازات والانتفاخ اليوم: تجنب الفول بقشره، الطعمية، الكشري، الكرنب، والبصل النيء. تم توجيه اقتراحات وجباتك نحو المشويات الخفيفة، الزبادي اللايت، الأرز، والسمك المشوي مع مشروب نعناع أو ينسون دافئ.'
    });
  }

  // 2. تشخيص الحالة النفسية ومستوى النشاط والربط بالتغذية
  if (moodStatus === 'lethargic') {
    alerts.push({
      type: 'info',
      icon: '😴',
      title: 'روشتة التغلب على الخمول والكسل في الشغل:',
      message: `حاسس بخمول؟ حديد يومك حتى الآن (${totals.iron.toFixed(1)} / ${t.iron || 14} ملجم) والماء (${currLog.waterCups} أكواب). ابعد عن الأكلات الدسمة والسكريات السريعة، واعتمد على وجبات ترفع الطاقة والتركيز بهدوء (بيض مسلوق، بليلة، سمك مشوي، موزة أو تمر، وكوب ماء كبير) وتأكد من أخذ فيتامين د و B12.`,
      actionLabel: 'راجع مكملات النشاط',
      actionTab: 'supplements'
    });
  } else if (moodStatus === 'sad') {
    alerts.push({
      type: 'info',
      icon: '😔',
      title: 'دعم نفسي غذائي لتحسين المزاج ورفع السيروتونين:',
      message:
        'الأمعاء هي المسؤولة عن إنتاج 90% من هرمون السعادة (السيروتونين)! رشحنا لك في اقتراحات اليوم أكلات غنية بالتربتوفان وأوميجا 3 والماغنيسيوم وفيتامين B (سمك مشوي، تونة، بليلة باللبن، شوفان بالموز، بطاطا مشوية) لتحسين المزاج طبيعياً بدون لخبطة السكر.'
    });
  } else if (moodStatus === 'stressed') {
    alerts.push({
      type: 'info',
      icon: '🤯',
      title: 'تهدئة التوتر وضغط الشغل (حماية القولون العصبي):',
      message:
        'التوتر يرفع الكورتيزول ويهيج القولون والمرارة. قلل القهوة والموالح اليوم، وركز على الأطعمة الغنية بالبوتاسيوم والماغنيسيوم المهدئة للأعصاب (موز، زبادي، بطاطس مشوية، سلطة خضراء، وينسون دافئ).'
    });
  }

  // 3. تشخيص المرارة والدهون
  if (p.gallbladderRemoved) {
    const maxSafeFat = digStatus === 'diarrhea' ? Math.min(10, Number(p.maxFatPerMeal || 14)) : Number(p.maxFatPerMeal || 14);
    const maxFatInSitting = totals.effectiveMaxMealFat || totals.maxSingleMealFat;
    if (maxFatInSitting > maxSafeFat) {
      const sittingLabel =
        totals.maxMealGroupFat > totals.maxSingleMealFat
          ? `وجبة (${totals.heaviestMealGroupName}) بمجموع ${totals.maxMealGroupFat.toFixed(1)} جم دهون`
          : `"${totals.heaviestFatMealName}" (${totals.maxSingleMealFat} جم دهون)`;
      alerts.push({
        type: 'danger',
        icon: '🩺',
        title: `تنبيه المرارة: وجبة دسمة تجاوزت ${maxSafeFat} جم دهون!`,
        message: `${sittingLabel} في وجبة واحدة! لأنك شايل المرارة، الكبد يفرز العصارة الصفراوية ببطء. الحل الآن: خذ كبسولة إنزيمات هاضمة، كُل تفاحة أو شوفان أو سلطة (ألياف ذائبة لربط الصفراء)، واشرب ماء دافئ.`,
        actionLabel: 'عرض الأكلات المريحة بدون مرارة',
        actionTab: 'foods',
        actionCategory: 'gallbladder_safe'
      });
    } else if (currLog.meals.length > 0) {
      alerts.push({
        type: 'success',
        icon: '🩺',
        title: 'حالة الهضم بعد استئصال المرارة: آمنة وممتازة 💚',
        message: `أعلى كمية دهون في وجبة واحدة هي ${maxFatInSitting.toFixed(1)} جم (أقل من حد الأمان ${maxSafeFat} جم/وجبة). استمر في تقسيم وجباتك وأكل الألياف الذائبة!`
      });
    }
  }

  const calRatio = totals.calories / Math.max(t.calories, 1);
  const fiberRatio = totals.fiber / Math.max(t.fiber, 1);

  if (totals.calories > 400 && fiberRatio < calRatio * 0.65 && digStatus !== 'diarrhea') {
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
      message: 'اختر أكلتك من الاقتراحات الذكية بالأسفل أو من المنيو المصري، وحدد حالة الإخراج والشعور النفسي ليتم تكييف النظام فوراً!'
    });
  }

  return alerts;
}

// ===== محرك اقتراحات الوجبات والأكل الذكي بناءً على النظام والمرارة وحالة الإخراج والحالة النفسية =====
function evaluateFoodForUserState(food, totals, targetMealTiming = null) {
  const p = state.profile;
  const t = p.targets;
  const dig = getActiveDigestionStatus();
  const mood = getActiveMoodStatus();
  const remainingCal = Math.max(250, t.calories - totals.calories);
  const maxSafeFat = dig === 'diarrhea' ? Math.min(10, Number(p.maxFatPerMeal || 14)) : Number(p.maxFatPerMeal || 14);
  const nameNorm = window.normalizeArabic(food.name);

  let score = 50;
  const reasons = [];

  // 1. فلترة المرارة والدهون
  if (p.gallbladderRemoved) {
    if (food.fats > maxSafeFat) {
      return { eligible: false, score: -100, reasons: [] };
    }
    if (food.gallbladderStatus === 'safe') {
      score += 20;
      reasons.push(`🩺 آمن للمرارة (${food.fats}جم دهون)`);
    }
  }

  // 2. فلترة السعرات والهدف (نزول وزن / ثبات / عضلات)
  if (food.calories > remainingCal + 150) {
    score -= 25;
  }
  if (p.goal === 'fat_loss') {
    if (food.calories <= 420 && food.protein >= 12 && food.fiber >= 4) {
      score += 18;
      reasons.push('🔥 مشبع ومثالي لنزول الوزن');
    }
  } else if (p.goal === 'muscle') {
    if (food.protein >= 20) {
      score += 22;
      reasons.push(`💪 غني بالبروتين (${food.protein}جم) لبناء العضلات`);
    }
  } else {
    if (food.officeImpact === 'energizing') {
      score += 12;
    }
  }

  // 3. التكييف مع حالة الإخراج (إمساك / إسهال / انتفاخ / عادي)
  if (dig === 'constipation') {
    if (food.fiber >= 6 || nameNorm.includes('سلطه') || nameNorm.includes('شوفان') || nameNorm.includes('بليله') || nameNorm.includes('خضار') || nameNorm.includes('عدس') || nameNorm.includes('فول') || nameNorm.includes('برتقال') || nameNorm.includes('جوافه') || nameNorm.includes('ملوخيه') || nameNorm.includes('باميه')) {
      score += 30;
      reasons.push(`🟠 غني بالألياف (${food.fiber}جم) وملين طبيعي للإمساك`);
    } else if (food.fiber < 2.5) {
      score -= 25;
    }
  } else if (dig === 'diarrhea') {
    // في حالة الإسهال نستبعد المقليات والبقول القشرية الثقيلة والمسبكات الحارة
    if (
      food.fats > 9 ||
      nameNorm.includes('طعميه') ||
      nameNorm.includes('كشري') ||
      nameNorm.includes('محشي') ||
      nameNorm.includes('حواوشي') ||
      nameNorm.includes('ملوخيه') ||
      nameNorm.includes('باميه') ||
      nameNorm.includes('فول بالزيت')
    ) {
      return { eligible: false, score: -100, reasons: [] };
    }
    if (
      nameNorm.includes('تفاح') ||
      nameNorm.includes('موز') ||
      nameNorm.includes('شوفان') ||
      nameNorm.includes('ارز') ||
      nameNorm.includes('بطاطس مسلوقه') ||
      nameNorm.includes('بطاطا') ||
      nameNorm.includes('صدور') ||
      nameNorm.includes('مشوي') ||
      nameNorm.includes('قريش') ||
      nameNorm.includes('زبادي') ||
      nameNorm.includes('شوربه')
    ) {
      score += 35;
      reasons.push('🔴 لطيف وممسك للأمعاء ويمتص العصارة الصفراوية');
    }
  } else if (dig === 'bloating') {
    if (
      nameNorm.includes('فول') ||
      nameNorm.includes('طعميه') ||
      nameNorm.includes('كشري') ||
      nameNorm.includes('كرنب') ||
      nameNorm.includes('قرنبيط') ||
      nameNorm.includes('بصل')
    ) {
      return { eligible: false, score: -100, reasons: [] };
    }
    if (
      nameNorm.includes('مشوي') ||
      nameNorm.includes('سمك') ||
      nameNorm.includes('زبادي') ||
      nameNorm.includes('قريش') ||
      nameNorm.includes('بيض مسلوق') ||
      nameNorm.includes('ارز') ||
      nameNorm.includes('شوفان')
    ) {
      score += 25;
      reasons.push('🟡 هادئ على القولون ولا يسبب غازات');
    }
  }

  // 4. التكييف مع الحالة النفسية والشعور (خمول / حزن / توتر / نشاط)
  if (mood === 'lethargic') {
    if (food.officeImpact === 'high-coma') {
      return { eligible: false, score: -100, reasons: [] };
    }
    if (food.officeImpact === 'energizing' || (food.iron || 0) >= 2.5 || food.protein >= 16) {
      score += 25;
      reasons.push(`⚡ يرفع النشاط والتركيز ويقاوم الخمول (${food.iron || 2}ملجم حديد)`);
    }
  } else if (mood === 'sad') {
    if (
      nameNorm.includes('سمك') ||
      nameNorm.includes('تونه') ||
      nameNorm.includes('موز') ||
      nameNorm.includes('شوفان') ||
      nameNorm.includes('بليله') ||
      nameNorm.includes('بطاطا') ||
      nameNorm.includes('بيض') ||
      (food.potassium || 0) >= 400
    ) {
      score += 28;
      reasons.push('😊 يدعم السيروتونين والمزاج النفسي (أوميجا 3 / ماغنيسيوم / تربتوفان)');
    }
  } else if (mood === 'stressed') {
    if ((food.sodium || 0) > 700) {
      score -= 20;
    }
    if ((food.potassium || 0) >= 380 || nameNorm.includes('زبادي') || nameNorm.includes('موز') || nameNorm.includes('سلطه') || nameNorm.includes('بطاطس') || nameNorm.includes('شوفان')) {
      score += 24;
      reasons.push(`🧘 غني بالبوتاسيوم (${food.potassium || 400}ملجم) لتهدئة التوتر العصبي`);
    }
  }

  // 5. مطابقة توقيت الوجبة المطلوب
  if (targetMealTiming && targetMealTiming !== 'auto') {
    if (targetMealTiming === 'فطار' && (food.category === 'فطار' || food.category === 'ساندوتشات')) {
      score += 20;
    } else if (targetMealTiming === 'غدا' && (food.category === 'غدا' || food.category === 'كشري وطواجن')) {
      score += 20;
    } else if (targetMealTiming === 'عشا' && (food.category === 'فطار' || food.category === 'سناك' || (food.calories <= 360 && food.fats <= 10))) {
      score += 20;
    } else if (targetMealTiming === 'سناك' && (food.category === 'سناك' || food.category === 'إضافات')) {
      score += 25;
    } else {
      score -= 35;
    }
  }

  if (reasons.length === 0) {
    reasons.push('متوازن ومناسب لنظامك اليومي');
  }

  return {
    eligible: score > 25,
    score,
    reasons: reasons.slice(0, 2)
  };
}

function getAutoMealTimingNow() {
  const currLog = getCurrentDayLog();
  const loggedTimings = new Set(currLog.meals.map((m) => m.mealTiming));
  const hour = new Date().getHours();
  if (!loggedTimings.has('فطار') && hour < 12) return 'فطار';
  if (!loggedTimings.has('غدا') && hour >= 12 && hour < 18) return 'غدا';
  if (!loggedTimings.has('عشا') && hour >= 18) return 'عشا';
  if (!loggedTimings.has('فطار')) return 'فطار';
  if (!loggedTimings.has('غدا')) return 'غدا';
  if (!loggedTimings.has('عشا')) return 'عشا';
  return 'سناك';
}

function getPersonalizedMealSuggestions(filterTiming = 'auto', limit = 4) {
  const totals = getTodayTotals();
  const effectiveTiming = filterTiming === 'auto' ? getAutoMealTimingNow() : filterTiming;
  const currLog = getCurrentDayLog();
  const alreadyLoggedIds = new Set(currLog.meals.map((m) => m.id));

  const scored = (state.foodsDb || [])
    .map((food) => {
      const evalRes = evaluateFoodForUserState(food, totals, effectiveTiming);
      const alreadyPenalty = alreadyLoggedIds.has(food.id) ? 15 : 0;
      return {
        food,
        timing: effectiveTiming,
        score: evalRes.score - alreadyPenalty,
        eligible: evalRes.eligible,
        reasons: evalRes.reasons
      };
    })
    .filter((item) => item.eligible)
    .sort((a, b) => b.score - a.score);

  return {
    effectiveTiming,
    items: scored.slice(0, limit)
  };
}

function generateFullDayMealPlan() {
  const zeroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sodium: 0, iron: 0 };
  const slots = ['فطار', 'غدا', 'سناك', 'عشا'];
  const usedIds = new Set();
  const plan = [];

  slots.forEach((slot) => {
    const candidates = (state.foodsDb || [])
      .filter((f) => !usedIds.has(f.id))
      .map((f) => ({ food: f, ...evaluateFoodForUserState(f, zeroTotals, slot) }))
      .filter((x) => x.eligible)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const picked = candidates[0];
      usedIds.add(picked.food.id);
      plan.push({
        slot,
        food: picked.food,
        reasons: picked.reasons
      });
    }
  });

  const totalCal = plan.reduce((s, p) => s + (p.food.calories || 0), 0);
  const totalProt = plan.reduce((s, p) => s + (p.food.protein || 0), 0);
  const totalFiber = plan.reduce((s, p) => s + (p.food.fiber || 0), 0);
  const totalFats = plan.reduce((s, p) => s + (p.food.fats || 0), 0);

  return { plan, totalCal, totalProt, totalFiber, totalFats };
}

window.applySuggestedDayPlan = function () {
  const { plan } = generateFullDayMealPlan();
  if (!plan.length) return;
  const currLog = getCurrentDayLog();
  plan.forEach((item) => {
    currLog.meals.push({
      ...structuredClone(item.food),
      logId: 'log_plan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      multiplier: 1,
      mealTiming: item.slot,
      timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
  });
  saveState();
  showToast('تم تسجيل جدول وجبات اليوم المقترح بالكامل في يومياتك! 📅🎉');
  renderApp();
};

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
          <input id="edit-log-name" type="text" value="${escapeHtml(meal.name)}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
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
      <div class="grid grid-cols-4 gap-2">
        <div class="col-span-3">
          <label class="text-slate-300 font-bold block mb-1">اسم الأكلة</label>
          <input id="db-food-name" type="text" value="${escapeHtml(food.name)}" required placeholder="مثلاً: سندوتش كفتة بيتي" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">الرمز</label>
          <input id="db-food-emoji" type="text" value="${escapeHtml(food.emoji || '🍽️')}" class="w-full bg-slate-900 text-white text-center rounded-xl px-2 py-2 border border-white/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">المطعم / المصدر</label>
          <input id="db-food-rest" type="text" value="${escapeHtml(food.restaurantHint || '')}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">وصف الحصة</label>
          <input id="db-food-serving" type="text" value="${escapeHtml(food.serving || '')}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">تصنيف الأكلة</label>
          <select id="db-food-cat" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15">
            ${['سوبر ماركت ومشروبات', 'ساندوتشات', 'فطار', 'كشري وطواجن', 'غدا', 'سناك', 'إضافات']
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
        <textarea id="db-food-gb-note" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${escapeHtml(food.gallbladderNote || '')}</textarea>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">💡 نصيحة الشغل المكتبي</label>
        <textarea id="db-food-tip" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${escapeHtml(food.expertTip || '')}</textarea>
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
  const existing = !isNew ? state.foodsDb.find((f) => f.id === foodId) : null;
  const fatsVal = Number(document.getElementById('db-food-fats').value) || 0;
  const emojiVal = document.getElementById('db-food-emoji')?.value?.trim() || existing?.emoji || '🍽️';
  const updated = {
    id: foodId,
    name: document.getElementById('db-food-name').value.trim(),
    emoji: emojiVal,
    restaurantHint: document.getElementById('db-food-rest').value.trim(),
    serving: document.getElementById('db-food-serving').value.trim(),
    category: document.getElementById('db-food-cat').value,
    gallbladderStatus: document.getElementById('db-food-gb-status').value,
    calories: Number(document.getElementById('db-food-cal').value) || 0,
    protein: Number(document.getElementById('db-food-prot').value) || 0,
    fiber: Number(document.getElementById('db-food-fiber').value) || 0,
    carbs: Number(document.getElementById('db-food-carbs').value) || 0,
    fats: fatsVal,
    sodium: existing?.sodium ?? 500,
    iron: existing?.iron ?? 2.5,
    calcium: existing?.calcium ?? 60,
    potassium: existing?.potassium ?? 400,
    custom: isNew ? true : existing?.custom,
    officeImpact: fatsVal > 20 ? 'high-coma' : existing?.officeImpact || 'energizing',
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
        <input id="edit-supp-name" type="text" value="${escapeHtml(supp.name)}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">الجرعة</label>
          <input id="edit-supp-dosage" type="text" value="${escapeHtml(supp.dosage)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">موعد الأخذ</label>
          <input id="edit-supp-timing" type="text" value="${escapeHtml(supp.timing)}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">الفائدة والسبب</label>
        <textarea id="edit-supp-reason" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${escapeHtml(supp.reason || '')}</textarea>
      </div>
      <div>
        <label class="text-amber-300 font-bold block mb-1">ملاحظة / تنبيه الامتصاص</label>
        <input id="edit-supp-warning" type="text" value="${escapeHtml(supp.warning || '')}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
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
  const existing = !isNew ? state.supplementsList.find((s) => s.id === suppId) : null;
  const updated = {
    id: suppId,
    name: document.getElementById('edit-supp-name').value.trim(),
    dosage: document.getElementById('edit-supp-dosage').value.trim(),
    timing: document.getElementById('edit-supp-timing').value.trim(),
    reason: document.getElementById('edit-supp-reason').value.trim(),
    warning: document.getElementById('edit-supp-warning').value.trim(),
    icon: existing?.icon || '💊'
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
        <input id="edit-rem-title" type="text" value="${escapeHtml(rem.title)}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div>
        <label class="text-emerald-300 font-bold block mb-1">التكرار كل كام دقيقة؟</label>
        <input id="edit-rem-interval" type="number" min="5" max="720" value="${rem.intervalMinutes}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-emerald-500/40" />
      </div>
      <div>
        <label class="text-slate-300 font-bold block mb-1">وصف التذكير</label>
        <textarea id="edit-rem-desc" rows="2" class="w-full bg-slate-900 text-white rounded-xl p-2 border border-white/15">${escapeHtml(rem.description || '')}</textarea>
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
  const existing = !isNew ? state.reminders.find((r) => r.id === remId) : null;
  const updated = {
    id: remId,
    title: document.getElementById('edit-rem-title').value.trim(),
    intervalMinutes: Math.max(5, Number(document.getElementById('edit-rem-interval').value) || 60),
    description: document.getElementById('edit-rem-desc').value.trim(),
    enabled: existing?.enabled ?? true,
    icon: existing?.icon || '🔔'
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

// ===== محرك الخبير الذكي الأوفلاين 100% (يعمل بالكامل بدون إنترنت وبدون API Key: محادثة + تحليل صور الأكل) =====

// قاموس إضافي للأكلات والمكونات والمشروبات المصرية الشائعة للعمل 100% أوفلاين حتى لو لم تكن في القائمة المختصرة
const OFFLINE_EGYPTIAN_LEXICON = [
  { keywords: ['رنجه', 'فسيخ'], name: 'وجبة رنجة بالبصل والليمون والعيش', emoji: '🐟', serving: 'سمكة رنجة متوسطة + رغيف بلدي', calories: 460, protein: 28, carbs: 42, fats: 18, fiber: 5, sodium: 1650, iron: 2.8, calcium: 70, potassium: 480, gallbladderStatus: 'heavy_fat', gallbladderNote: 'عالية الدهون والأملاح جداً لمن أزال المرارة؛ اشرب 3 أكواب ماء وكُل خيار وخس كثير.' },
  { keywords: ['بشاميل', 'مكرونه بالبشاميل'], name: 'مكرونة بالبشاميل واللحمة المفرومة', emoji: '🍲', serving: 'قطعة متوسطة • 250 جم', calories: 520, protein: 22, carbs: 48, fats: 26, fiber: 3, sodium: 680, iron: 2.6, calcium: 180, potassium: 360, gallbladderStatus: 'heavy_fat', gallbladderNote: 'دسمة على المرارة (26 جم دهون من السمنة واللبن)؛ اكتفِ بنصف قطعة مع سلطة خضراء.' },
  { keywords: ['بانيه', 'فراخ بانيه', 'استربس'], name: 'صدور فراخ بانيه مقلية', emoji: '🍗', serving: 'قطعتين متوسطتين • 160 جم', calories: 410, protein: 29, carbs: 22, fats: 22, fiber: 1.5, sodium: 620, iron: 1.8, calcium: 35, potassium: 340, gallbladderStatus: 'heavy_fat', gallbladderNote: 'القلي يرفع الدهون إلى 22 جم؛ الأفضل تسويتها في الإيرفراير أو الفرن لتصبح آمنة للمرارة.' },
  { keywords: ['بيتزا', 'فطيره'], name: 'بيتزا أو فطيرة شرقي بالجبنة واللحوم', emoji: '🍕', serving: 'شريحتين متوسطتين • 220 جم', calories: 540, protein: 21, carbs: 58, fats: 24, fiber: 3.5, sodium: 920, iron: 2.5, calcium: 240, potassium: 310, gallbladderStatus: 'heavy_fat', gallbladderNote: 'الجبن السايحة والعجين الدسم ثقيلة بعد استئصال المرارة؛ كُل شريحة واحدة مع سلطة.' },
  { keywords: ['مسقعه'], name: 'طبق مسقعة باذنجان بالصلصة', emoji: '🍆', serving: 'طبق متوسط • 220 جم', calories: 380, protein: 9, carbs: 28, fats: 25, fiber: 6.5, sodium: 640, iron: 2.2, calcium: 55, potassium: 520, gallbladderStatus: 'heavy_fat', gallbladderNote: 'الباذنجان المقلي يشرب زيتاً كثيراً (25 جم دهون)؛ لو مشوي في الفرن تنخفض الدهون إلى 8 جم فقط!' },
  { keywords: ['ممبار', 'حمام محشي', 'بط'], name: 'وجبة ممبار أو بط/حمام محشي', emoji: '🍖', serving: 'حصة متوسطة • 220 جم', calories: 580, protein: 26, carbs: 52, fats: 29, fiber: 3, sodium: 780, iron: 3.8, calcium: 45, potassium: 390, gallbladderStatus: 'heavy_fat', gallbladderNote: 'وجبة شديدة الدسم (29 جم دهون)؛ تحتاج إنزيمات هاضمة وتقسيم الكمية.' },
  { keywords: ['اندومي', 'نودلز'], name: 'وجبة إندومي / نودلز سريعة التحضير', emoji: '🍜', serving: 'كيس واحد مطبوخ', calories: 350, protein: 7, carbs: 48, fats: 14, fiber: 2, sodium: 1150, iron: 1.5, calcium: 20, potassium: 140, gallbladderStatus: 'caution', gallbladderNote: 'زيت النودلز وتوابلها عالية الصوديوم والدهون؛ تخلص من كيس الزيت وأضف بيضة مسلوقة وخضار.' },
  { keywords: ['مانجا', 'مانجو'], name: 'ثمرة مانجو مصرية طازجة', emoji: '🥭', serving: 'ثمرة متوسطة • 200 جم', calories: 135, protein: 1.5, carbs: 35, fats: 0.6, fiber: 3.5, sodium: 5, iron: 0.4, calcium: 22, potassium: 320, gallbladderStatus: 'safe', gallbladderNote: 'خالية من الدهون ومريحة للمرارة، لكن اشرب بعدها ماء لتجنب الأملاح.' },
  { keywords: ['بطيخ', 'كنتالوب', 'شمام'], name: 'طبق بطيخ أو كنتالوب بارد', emoji: '🍉', serving: 'شريحتين كبيرتين • 280 جم', calories: 90, protein: 1.8, carbs: 22, fats: 0.4, fiber: 2, sodium: 10, iron: 0.6, calcium: 20, potassium: 340, gallbladderStatus: 'safe', gallbladderNote: 'مرطب ممتاز للأمعاء وخالٍ تماماً من الدهون.' },
  { keywords: ['عصير قصب', 'قصب'], name: 'كوب عصير قصب طازج', emoji: '🥤', serving: 'كوب كبير • 300 مل', calories: 210, protein: 0.5, carbs: 52, fats: 0, fiber: 0.5, sodium: 15, iron: 1.2, calcium: 30, potassium: 420, gallbladderStatus: 'safe', gallbladderNote: 'يرفع الطاقة والبوتاسيوم بسرعة بدون دهون، لكن انتبه لارتفاع السكر السريع.' },
  { keywords: ['شاي بلبن', 'نسكافيه بلبن', 'قهوه بلبن'], name: 'كوب شاي بلبن أو نسكافيه بلبن', emoji: '☕', serving: 'مج متوسط بلبن قليل الدسم', calories: 95, protein: 4.5, carbs: 12, fats: 3, fiber: 0, sodium: 65, iron: 0.2, calcium: 140, potassium: 190, gallbladderStatus: 'safe', gallbladderNote: 'آمن ومريح بشرط استخدام لبن قليل أو خالي الدسم.' },
  { keywords: ['بسبوسه', 'كنافه', 'قطايف', 'جلاش حلو', 'بقلاوه'], name: 'قطعة حلويات شرقية (بسبوسة / كنافة)', emoji: '🍮', serving: 'قطعة متوسطة • 120 جم', calories: 420, protein: 5, carbs: 62, fats: 17, fiber: 1.5, sodium: 140, iron: 1.0, calcium: 45, potassium: 130, gallbladderStatus: 'heavy_fat', gallbladderNote: 'السمنة البلدي مع الشربات السكري تجهد المرارة وتسبب خمولاً شديداً في الشغل.' },
  { keywords: ['كشري اصفر', 'كشري اسكندراني', 'عدس بجبه'], name: 'طبق كشري إسكندراني (أرز بعدس أصفر) مع بيض مسلوق', emoji: '🍛', serving: 'طبق متوسط + بيضة مسلوقة', calories: 410, protein: 18, carbs: 64, fats: 9, fiber: 6.5, sodium: 520, iron: 3.4, calcium: 70, potassium: 460, gallbladderStatus: 'safe', gallbladderNote: 'ممتاز ومغذي جداً بعد استئصال المرارة إذا طُبخ بزيت خفيف بدون قدحة ثقيلة.' }
];

// مرادفات العامية المصرية والأخطاء الإملائية الشائعة لتحسين البحث والفهم المحلي 100% بدون إنترنت
const OFFLINE_SYNONYM_REPLACEMENTS = [
  ['فلافل', 'طعميه'],
  ['سندوتشات', 'ساندوتش'],
  ['ساندوتشات', 'ساندوتش'],
  ['سندوتش', 'ساندوتش'],
  ['كوبيه', 'كوبايه'],
  ['فنجان القوه', 'فنجان قهوه'],
  ['فنجان القهوه', 'فنجان قهوه'],
  ['الواكه', 'فواكه'],
  ['اخمر', 'احمر'],
  ['سيبه', 'سايبه'],
  ['سوير ماركت', 'سوبر ماركت'],
  ['فيورى', 'فيوري'],
  ['fury', 'فيوري'],
  ['pepsi', 'بيبسي'],
  ['كوكاكولا', 'بيبسي'],
  ['كنز', 'كانز'],
  ['عيش', 'خبز بلدي'],
  ['رز', 'ارز'],
  ['فرخه', 'فراخ'],
  ['دجاج', 'فراخ'],
  ['سلطة', 'سلطه'],
  ['قريش', 'جبنه قريش'],
  ['تونه', 'تونة'],
  ['شوفان', 'شوفان'],
  ['عسل', 'عسل'],
  ['بطاطا', 'بطاطا']
];

// استخراج البصمة اللونية والضوئية المتقدمة لصورة الأكل وضغطها على Canvas (يعمل 100% أوفلاين على الجهاز)
function extractImageFeaturesAndResize(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const maxDim = 560;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.76);

        // تحليل ألوان وتفاصيل منتصف الطبق (100% على الجهاز بدون إنترنت)
        const sx = Math.floor(w * 0.14);
        const sy = Math.floor(h * 0.14);
        const sw = Math.max(1, Math.floor(w * 0.72));
        const sh = Math.max(1, Math.floor(h * 0.72));
        const imgData = ctx.getImageData(sx, sy, sw, sh).data;

        let greenPixels = 0;
        let redOrangePixels = 0;
        let warmBrownPixels = 0;
        let darkBrownPixels = 0;
        let whiteCreamPixels = 0;
        let yellowPixels = 0;
        let totalSampled = 0;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          totalSampled++;

          if (g > r + 14 && g > b + 14 && g > 55) {
            greenPixels++;
          } else if (r > 185 && g > 185 && b > 170 && Math.abs(r - g) < 30) {
            whiteCreamPixels++;
          } else if (r > 145 && g < 115 && b < 95 && r > g + 40) {
            redOrangePixels++;
          } else if (r > 175 && g > 140 && b < 105) {
            yellowPixels++;
          } else if (r > 105 && r < 200 && g > 65 && g < 160 && b < 115 && r > b + 25) {
            warmBrownPixels++;
          } else if (r > 50 && r <= 115 && g > 35 && g <= 95 && b < 75 && r > b + 15) {
            darkBrownPixels++;
          }
        }

        const denom = Math.max(1, totalSampled);
        resolve({
          dataUrl,
          fileName: file.name || '',
          features: {
            greenRatio: greenPixels / denom,
            redOrangeRatio: redOrangePixels / denom,
            warmBrownRatio: warmBrownPixels / denom,
            darkBrownRatio: darkBrownPixels / denom,
            whiteCreamRatio: whiteCreamPixels / denom,
            yellowRatio: yellowPixels / denom
          }
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// المحرك البصري المحلي الذكي للتعرف على صورة الطبق المصري وحساب عناصره الغذائية 100% أوفلاين (بدون إنترنت)
function localVisualFoodAnalyzer(visualFeatures, hintText = '') {
  const normHint = window.normalizeArabic(hintText);
  const f = visualFeatures || {};
  let candidateFoods = [];
  let visualSignatureLabel = 'تحليل بصري للألوان والقوام (أوفلاين 📴)';

  // 1. إذا كتب المستخدم كلمة مفتاحية مع الصورة (مثل: كشري، فراخ، فول، محشي، سلطة...)
  if (normHint) {
    for (const item of state.foodsDb) {
      const fNameNorm = window.normalizeArabic(item.name);
      const words = normHint.split(' ').filter((w) => w.length >= 2);
      if (words.some((w) => fNameNorm.includes(w))) {
        candidateFoods.push(item);
      }
    }
  }

  // 2. إذا لم يكتب وصفاً، نعتمد على البصمة اللونية الدقيقة للطبق المصري
  if (candidateFoods.length === 0) {
    if ((f.greenRatio || 0) > 0.17) {
      visualSignatureLabel = 'بصمة طبق غني بالخضروات / الأوراق الخضراء 🥗';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('ملوخيه') || n.includes('سلطه') || n.includes('خضار') || n.includes('طعميه') || n.includes('ورق عنب');
      });
    } else if ((f.redOrangeRatio || 0) > 0.15) {
      visualSignatureLabel = 'بصمة طبق مطبوخ بالصلصة / الطواجن / العدس 🍲';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('باميه') || n.includes('عدس') || n.includes('محشي') || n.includes('مكرونه') || n.includes('شكشوكه') || n.includes('كشري');
      });
    } else if ((f.whiteCreamRatio || 0) > 0.27) {
      visualSignatureLabel = 'بصمة طبق أبيض / أرز مع بروتين / أجبان وألبان 🍚';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('فراخ مشويه') || n.includes('جبنه قريش') || n.includes('بيض مسلوق') || n.includes('بليله') || n.includes('زبادي') || n.includes('ارز');
      });
    } else if ((f.yellowRatio || 0) > 0.18) {
      visualSignatureLabel = 'بصمة طبق ذهبي / شوربة عدس / شوفان / بطاطس 🥣';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('عدس') || n.includes('شوفان') || n.includes('بطاطس') || n.includes('موز') || n.includes('بليله');
      });
    } else if ((f.darkBrownRatio || 0) > 0.18) {
      visualSignatureLabel = 'بصمة مشويات / كفتة / كبدة / لحوم أو فول مدمس 🍖';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('كفته') || n.includes('مشوي') || n.includes('كبده') || n.includes('فول') || n.includes('حواوشي') || n.includes('سمك');
      });
    } else {
      visualSignatureLabel = 'بصمة أطباق مصرية أساسية (فول / كشري / مشويات / ساندوتشات) 🥙';
      candidateFoods = state.foodsDb.filter((item) => {
        const n = window.normalizeArabic(item.name);
        return n.includes('فول') || n.includes('كشري') || n.includes('فراخ مشويه') || n.includes('سمك') || n.includes('شاورما') || n.includes('بطاطس');
      });
    }
  }

  if (candidateFoods.length === 0) {
    candidateFoods = state.foodsDb.slice(0, 6);
  }

  const primary = candidateFoods[0];
  const alternatives = candidateFoods.slice(0, 6).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji || '🍽️' }));
  return buildPhotoAnalysisResponseFromFood(primary, alternatives, visualSignatureLabel, 1);
}

function buildPhotoAnalysisResponseFromFood(food, alternatives = [], sourceLabel = 'تحليل الصورة أوفلاين 📴', portionMult = 1) {
  const p = state.profile;
  const dig = getActiveDigestionStatus();
  const mood = getActiveMoodStatus();
  const mult = Number(portionMult || 1);
  const maxSafeFat = dig === 'diarrhea' ? Math.min(10, Number(p.maxFatPerMeal || 14)) : Number(p.maxFatPerMeal || 14);

  const cal = Math.round((food.calories || 0) * mult);
  const prot = Math.round((food.protein || 0) * mult * 10) / 10;
  const carbs = Math.round((food.carbs || 0) * mult * 10) / 10;
  const fats = Math.round((food.fats || 0) * mult * 10) / 10;
  const fiber = Math.round((food.fiber || 0) * mult * 10) / 10;
  const sodium = Math.round((food.sodium || 450) * mult);
  const iron = Math.round((food.iron || 2.5) * mult * 10) / 10;
  const calcium = Math.round((food.calcium || 60) * mult);
  const potassium = Math.round((food.potassium || 380) * mult);

  const gbNote = p.gallbladderRemoved
    ? fats > maxSafeFat
      ? `🔴 **تنبيه المرارة:** الدهون في هذه الكمية (${fats} جم) أعلى من حد الأمان الحالي (${maxSafeFat} جم/وجبة). اضغط على (0.5× نصف حصة) بالأسفل أو أضف سلطة خضراء.`
      : `🟢 **أمان المرارة:** الدهون (${fats} جم) آمنة ومريحة للهضم بدون مرارة.`
    : '';

  let digAndMoodNote = '';
  if (dig === 'constipation') {
    digAndMoodNote =
      fiber >= 5
        ? `🟠 **لحالة الإمساك:** ممتاز! يحتوي على **${fiber} جم ألياف** تنشط حركة الأمعاء.`
        : `🟠 **لحالة الإمساك:** الألياف هنا (${fiber} جم) قليلة؛ أضف طبق سلطة خضراء وكوبين ماء مع هذه الوجبة.`;
  } else if (dig === 'diarrhea') {
    digAndMoodNote =
      fats <= 9
        ? `🔴 **لحالة الإسهال:** دهونه خفيفة (${fats} جم) ومناسب لتهدئة الأمعاء.`
        : `🔴 **لحالة الإسهال:** يفضل تقليل الدهون والصلصة في هذا الطبق وتناول تفاحة أو أرز مسلوق بجانبه.`;
  } else if (mood === 'lethargic') {
    digAndMoodNote =
      food.officeImpact === 'high-coma'
        ? `😴 **تنبيه الخمول:** هذه الوجبة قد تسبب نعاساً بعد الأكل؛ اكتفِ بنصف حصة.`
        : `⚡ **للنشاط والتركيز:** تمدك بـ **${prot} جم بروتين** و **${iron} ملجم حديد** لمقاومة الخمول.`;
  }

  const parsedMeal = {
    ...structuredClone(food),
    id: 'photo_meal_' + Date.now(),
    sourceFoodId: food.id,
    portionMultiplier: mult,
    restaurantHint: sourceLabel,
    serving: mult === 1 ? food.serving : `${food.serving} (الحصة × ${mult})`,
    calories: cal,
    protein: prot,
    carbs,
    fats,
    fiber,
    sodium,
    iron,
    calcium,
    potassium,
    photoAlternatives: alternatives
  };

  const replyText = [
    `📸 **تحليل صورة الطبق (أوفلاين بدون إنترنت):**`,
    `• الطبق المقدر: **${food.emoji || '🍽️'} ${food.name}** (${parsedMeal.serving})`,
    `• 🔥 **السعرات:** ${cal} سعرة | 🍗 **البروتين:** ${prot} جم | 🥖 **الكارب:** ${carbs} جم`,
    `• 🩺 **الدهون:** ${fats} جم | 🌾 **الألياف:** ${fiber} جم`,
    `• 🧪 **المعادن:** صوديوم ${sodium} ملجم • حديد ${iron} ملجم • كالسيوم ${calcium} ملجم • بوتاسيوم ${potassium} ملجم`,
    gbNote ? `• ${gbNote}` : '',
    digAndMoodNote ? `• ${digAndMoodNote}` : '',
    `\n💡 *تقدر تغير حجم الحصة (0.5× أو 1× أو 1.5× أو 2×) أو تختار أي صنف آخر من القائمة بالأسفل بدون إنترنت:*`
  ]
    .filter(Boolean)
    .join('\n');

  return { replyText, parsedMeal };
}

// التبديل الفوري بين الأطباق المرشحة أو أي أكلة من الموسوعة لصورة الأكل بضغطة زر (100% أوفلاين)
window.switchPhotoDetectedFood = function (msgIndex, foodId, newMult = null) {
  const msg = state.aiHistory[msgIndex];
  const food = state.foodsDb.find((f) => f.id === foodId);
  if (!msg || !food) return;
  const alts = msg.parsedMeal?.photoAlternatives || [];
  const mult = newMult !== null ? Number(newMult) : Number(msg.parsedMeal?.portionMultiplier || 1);
  const updated = buildPhotoAnalysisResponseFromFood(food, alts, 'تحليل الصورة المحلي (أوفلاين 📴)', mult);
  updated.parsedMeal.suggestedTiming = msg.parsedMeal?.suggestedTiming || getAutoMealTimingNow();
  msg.text = updated.replyText;
  msg.parsedMeal = updated.parsedMeal;
  saveState();
  showToast(`تم تحديث حساب الوجبة إلى: ${food.name} (×${mult}) ✅`);
  renderApp();
};

// تغيير حجم الحصة المحسوبة في بطاقة الخبير الذكي (0.5×، 1×، 1.5×، 2×) أوفلاين
window.changeAiMealPortion = function (msgIndex, multVal) {
  const msg = state.aiHistory[msgIndex];
  if (!msg || !msg.parsedMeal) return;
  const mult = Number(multVal) || 1;
  const sourceId = msg.parsedMeal.sourceFoodId;
  if (sourceId) {
    window.switchPhotoDetectedFood(msgIndex, sourceId, mult);
    return;
  }
  const prevMult = Number(msg.parsedMeal.portionMultiplier || 1);
  const ratio = mult / prevMult;
  msg.parsedMeal.portionMultiplier = mult;
  msg.parsedMeal.calories = Math.round(msg.parsedMeal.calories * ratio);
  msg.parsedMeal.protein = Math.round(msg.parsedMeal.protein * ratio * 10) / 10;
  msg.parsedMeal.carbs = Math.round(msg.parsedMeal.carbs * ratio * 10) / 10;
  msg.parsedMeal.fats = Math.round(msg.parsedMeal.fats * ratio * 10) / 10;
  msg.parsedMeal.fiber = Math.round(msg.parsedMeal.fiber * ratio * 10) / 10;
  msg.parsedMeal.sodium = Math.round((msg.parsedMeal.sodium || 450) * ratio);
  msg.parsedMeal.iron = Math.round((msg.parsedMeal.iron || 2.5) * ratio * 10) / 10;
  msg.parsedMeal.calcium = Math.round((msg.parsedMeal.calcium || 60) * ratio);
  msg.parsedMeal.potassium = Math.round((msg.parsedMeal.potassium || 380) * ratio);
  saveState();
  showToast(`تم تعديل حجم الحصة إلى (×${mult}) وحساب العناصر فوراً ⚡`);
  renderApp();
};

// معالجة اختيار أو تصوير صورة الأكل في واجهة الخبير الذكي (100% أوفلاين بدون إنترنت)
window.handleFoodPhotoSelected = async function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const processed = await extractImageFeaturesAndResize(file);
    state.pendingAiImage = processed;
    await triggerPhotoAnalysisNow();
  } catch (err) {
    showToast('تعذر قراءة الصورة، جرب صورة أخرى ❌');
  }
};

window.clearPendingAiImage = function () {
  state.pendingAiImage = null;
  renderApp();
};

async function triggerPhotoAnalysisNow() {
  if (!state.pendingAiImage) return;
  const imgObj = state.pendingAiImage;
  const input = document.getElementById('ai-meal-input');
  const caption = input?.value?.trim() || '';
  if (input) input.value = '';
  state.pendingAiImage = null;

  const suggestedTiming = inferMealTimingFromText(caption);
  state.aiHistory.push({
    role: 'user',
    text: caption || '📸 صوّرت الوجبة دي، احسبلي سعراتها وعناصرها الغذائية أوفلاين!',
    imageUrl: imgObj.dataUrl
  });

  // تحليل فوري 100% على الجهاز بدون أي انتظار للشبكة
  const result = localVisualFoodAnalyzer(imgObj.features, caption);
  if (result.parsedMeal) {
    result.parsedMeal.suggestedTiming = suggestedTiming;
  }
  state.aiHistory.push({
    role: 'assistant',
    text: result.replyText,
    parsedMeal: result.parsedMeal
  });
  saveState();
  showToast('تم تحليل صورة الطبق وحساب السعرات والعناصر (أوفلاين 📴) بنجاح!');
  renderApp();
}

// المحرك المصري الأوفلاين الشامل (يفهم الاستشارات والأسئلة والوجبات فوراً 100% بدون إنترنت)
function localEgyptianMealParser(text) {
  let norm = window.normalizeArabic(text);
  for (const [fromWord, toWord] of OFFLINE_SYNONYM_REPLACEMENTS) {
    norm = norm.replaceAll(window.normalizeArabic(fromWord), window.normalizeArabic(toWord));
  }

  // 1. استشارة عن ملخص وتقييم اليوم ("تقييم يومي" / "فاضلي كام سعرة" / "اكلت ايه النهارده")
  if (norm.includes('تقييم يومي') || norm.includes('فاضلي كام') || norm.includes('باقي كام سعره') || norm.includes('ملخص يومي')) {
    const totals = getTodayTotals();
    const t = state.profile.targets;
    const remCal = Math.max(0, t.calories - totals.calories);
    const sug = getPersonalizedMealSuggestions('auto', 1);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `📊 **تقرير يومك الأوفلاين لحد دلوقتي:**\n` +
        `• 🔥 السعرات المسجلة: **${totals.calories} / ${t.calories} سعرة** (متبقي لك **${remCal} سعرة**).\n` +
        `• 🍗 البروتين: **${totals.protein.toFixed(0)} / ${t.protein} جم** | 🌾 الألياف: **${totals.fiber.toFixed(1)} / ${t.fiber} جم**.\n` +
        `• 🩺 الدهون اليومية: **${totals.fats.toFixed(1)} جم** (أقصى وجبة واحدة: **${(totals.effectiveMaxMealFat || 0).toFixed(1)} جم** من حد المرارة ${state.profile.maxFatPerMeal} جم).\n` +
        `• 👇 لو حابب تكمل يومك بوجبة متوازنة تناسب السعرات المتبقية، أرشحلك:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 2. استشارة عن الإمساك
  if (norm.includes('امساك') || norm.includes('الامساك')) {
    updateDigestionStatus('constipation');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `🟠 **سجلت عندك إن حالة الإخراج الآن (إمساك) وعدّلت نظامك فوراً (أوفلاين)!**\n` +
        `• **السبب والحل السريع:** قلة المية مع الجلوس الطويل في الشغل بتبطئ حركة القولون.\n` +
        `• **روشتة الخبير الفورية:**\n` +
        `  1. اشرب **كوبايتين مية دافية** دلوقتي (زودت هدف المية في نظامك).\n` +
        `  2. كُل ألياف ذائبة وملينة طبيعية زي: **بليلة قمح باللبن اللايت، شوفان، طبق سلطة خضراء كبير بزيت زيتون خفيف، شوربة خضار أو عدس، وبرتقال أو جوافة**.\n` +
        `  3. رشحتلك تحت وجبة ممتازة لعلاج الإمساك ومريحة للمرارة تقدر تضيفها ليومك:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 3. استشارة عن الإسهال
  if (norm.includes('اسهال') || norm.includes('الاسهال') || norm.includes('ليونه')) {
    updateDigestionStatus('diarrhea');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb.find((f) => window.normalizeArabic(f.name).includes('فراخ مشويه')) || state.foodsDb[0];
    return {
      replyText:
        `🔴 **سجلت عندك إن حالة الإخراج (إسهال / ليونة) وعدّلت النظام لحماية الهضم والمرارة!**\n` +
        `• **ليه بيحصل ده؟** بعد استئصال المرارة، العصارة الصفراوية بتنزل مباشرة للأمعاء ولو الأكلة فيها دهون أو مسبكات بتعمل إسهال صفراوي.\n` +
        `• **تعديلات النظام الآن:**\n` +
        `  1. خفضت الحد الآمن لدهون الوجبة إلى **9 جم دهون فقط**.\n` +
        `  2. اعتمد النهاردة على أكلات تمتص الصفراء وتمسك البطن: **تفاح مقشر، موز، أرز أبيض مسلوق، بطاطس مسلوقة، شوفان بالمية أو لبن خالي الدسم، وصدور فراخ مشوية أو مسلوقة**.\n` +
        `  3. امتنع تماماً النهاردة عن: اللبن الكامل الدسم، المقليات، الشطة، والملوخية أو البقول الثقيلة.`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 4. استشارة عن الانتفاخ والقولون والحموضة
  if (norm.includes('انتفاخ') || norm.includes('غازات') || norm.includes('قولون') || norm.includes('حموضه') || norm.includes('ارتجاع')) {
    updateDigestionStatus('bloating');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `🟡 **تم تفعيل وضع تهدئة الانتفاخ والقولون في نظامك (أوفلاين)!**\n` +
        `• استبعدت من اقتراحاتك النهاردة الفول بقشره، الطعمية، الكشري، الكرنب، والبصل.\n` +
        `• **أفضل أكل يريح بطنك دلوقتي:** صدور فراخ أو سمك مشوي، أرز أبيض أو بسمتي، زبادي لايت بعصرة ليمون أو رشة كمون، ومشروب نعناع أو ينسون دافئ.`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 5. استشارة عن الخمول والكسل
  if (norm.includes('خمول') || norm.includes('كسل') || norm.includes('نعاس') || norm.includes('تعبان') || norm.includes('مفرهد') || norm.includes('صداع')) {
    updateMoodStatus('lethargic');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `😴 **سجلت إنك حاسس بـ (خمول وإرهاق) وظبطت النظام لرفع طاقتك بدون تخمة!**\n` +
        `• **خلي بالك:** الخمول وقت الشغل غالباً سببه إما وجبة تقيلة سحبت الدم للمعدة، أو نقص مية وحديد وفيتامين د.\n` +
        `• **الحل الفوري:** اشرب كوباية مية كبيرة، قوم اتحرك دقيقتين، وكل وجبة خفيفة عالية البروتين والحديد والكارب المعقد زي الترشيح ده:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 6. استشارة عن الحزن والمزاج
  if (norm.includes('حزين') || norm.includes('مخنوق') || norm.includes('متضايق') || norm.includes('مكتئب') || norm.includes('زعلان') || norm.includes('مزاج')) {
    updateMoodStatus('sad');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `😔 **سلامة قلبك يا بطل! سجلت حالتك النفسية وعدّلت اقتراحات الأكل لدعم السيروتونين والمزاج.**\n` +
        `• علمياً **90% من هرمون السيروتونين (هرمون السعادة والهدوء)** بيتصنع في الجهاز الهضمي!\n` +
        `• بدل الحلويات اللي بترفع السكر وتوقعه وتزود الضيق، ركز النهاردة على أكلات غنية بـ **التربتوفان، أوميجا 3، والماغنيسيوم** زي: **السمك المشوي، التونة، البليلة باللبن، الشوفان بالموز، أو البطاطا المشوية**:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 7. استشارة عن التوتر وضغط الشغل
  if (norm.includes('متوتر') || norm.includes('قلقان') || norm.includes('مضغوط') || norm.includes('ضغط شغل')) {
    updateMoodStatus('stressed');
    const sug = getPersonalizedMealSuggestions('auto', 2);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    return {
      replyText:
        `🤯 **هدّي أعصابك يا بطل! سجلت حالة (توتر وضغط شغل) وربطتها بنظامك.**\n` +
        `• التوتر بيرفع الكورتيزول وبيخلي القولون والمرارة حساسين جداً للدهون والكافيين.\n` +
        `• قلل القهوة والموالح النهاردة، وخد أكلات غنية بالبوتاسيوم والماغنيسيوم بتهدي الجهاز العصبي زي:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 8. طلب اقتراح وجبة أو جدول أكل
  if (norm.includes('اقترح') || norm.includes('اقتراح') || norm.includes('اكل ايه') || norm.includes('جعان') || norm.includes('ترشح') || norm.includes('جدول')) {
    const timing = inferMealTimingFromText(text);
    const sug = getPersonalizedMealSuggestions(timing, 3);
    const topFood = sug.items[0]?.food || state.foodsDb[0];
    const digLabel = (window.DIGESTION_STATES.find((d) => d.id === getActiveDigestionStatus()) || {}).label || 'عادي';
    const moodLabel = (window.MOOD_STATES.find((m) => m.id === getActiveMoodStatus()) || {}).label || 'عادي';
    const listText = sug.items
      .map((it, idx) => `${idx + 1}. **${it.food.emoji || '🍽️'} ${it.food.name}** (${it.food.calories} سعرة • ${it.food.fats}جم دهون • ${it.food.fiber}جم ألياف) — *${it.reasons.join('، ')}*`)
      .join('\n');

    return {
      replyText:
        `🎯 **أفضل اقتراحات وجبة (${sug.effectiveTiming}) مفصلة لنظامك، المرارة، الإخراج (${digLabel})، وحالتك النفسية (${moodLabel}):**\n\n` +
        listText +
        `\n\n👇 جهزتلك أفضل اختيار منهم في البطاقة عشان تضيفه لسجل يومك بضغطة زر:`,
      parsedMeal: structuredClone(topFood)
    };
  }

  // 9. البحث الذكي الموزون في موسوعة الأكلات المصرية والسوبر ماركت والمشروبات + القاموس الإضافي الأوفلاين
  const STOP_WORDS = new Set(['فطرت', 'اتغديت', 'اتعشيت', 'اكلت', 'شربت', 'واحد', 'واحده', 'عاوز', 'اخدت', 'جبنه', 'ساندوتش', 'علبه', 'كوبايه']);
  const matchedFoods = [];

  // دالة مساعدة لإيجاد أدق أكلة مطابقة لمقطع نصي بالاعتماد على عدد الكلمات المتطابقة والوزن الدقيق
  function findBestFoodMatchForSegment(segNorm) {
    // حالات خاصة مباشرة فائقة الدقة لما طلبه المستخدم
    if (segNorm.includes('بطاطس علي فول') || (segNorm.includes('بطاطس') && segNorm.includes('فول') && !segNorm.includes('طبق'))) {
      const m = state.foodsDb.find((f) => f.id === 'batates_on_foul_sandwich');
      if (m) return m;
    }
    if (segNorm.includes('شيدر') && (segNorm.includes('سايبه') || segNorm.includes('شعبي') || segNorm.includes('بيت الجمله') || segNorm.includes('زيت'))) {
      const m = state.foodsDb.find((f) => f.id === 'cheddar_loose_popular_palm_oil');
      if (m) return m;
    }
    if (segNorm.includes('فنجان') && (segNorm.includes('قهوه') || segNorm.includes('قوه') || segNorm.includes('100') || segNorm.includes('75'))) {
      const m = state.foodsDb.find((f) => f.id === 'coffee_finjan_small_85ml');
      if (m) return m;
    }
    if ((segNorm.includes('قهوه') || segNorm.includes('قوه')) && (segNorm.includes('كوبايه') || segNorm.includes('وسط') || segNorm.includes('200'))) {
      const m = state.foodsDb.find((f) => f.id === 'coffee_cup_medium_200ml');
      if (m) return m;
    }
    if (segNorm.includes('فيوري')) {
      const m = state.foodsDb.find((f) => f.id === 'fury_energy_drink');
      if (m) return m;
    }
    if (segNorm.includes('بيبسي') || segNorm.includes('كوكاكولا')) {
      const isDiet = segNorm.includes('دايت') || segNorm.includes('زيرو') || segNorm.includes('بدون سكر');
      const m = state.foodsDb.find((f) => f.id === (isDiet ? 'pepsi_diet_zero_can_330ml' : 'pepsi_regular_can_330ml'));
      if (m) return m;
    }
    if (segNorm.includes('بيتي') || segNorm.includes('جهينه') || (segNorm.includes('عصير') && !segNorm.includes('قصب'))) {
      const isPure = segNorm.includes('بيور') || segNorm.includes('بدون سكر');
      const m = state.foodsDb.find((f) => f.id === (isPure ? 'juice_pack_pure_no_sugar' : 'juice_pack_beyti_juhayna_sweetened'));
      if (m) return m;
    }
    if (segNorm.includes('تونه') || segNorm.includes('تونة')) {
      const isShredded = segNorm.includes('مفتته') || segNorm.includes('شعبي') || segNorm.includes('زيت');
      const m = state.foodsDb.find((f) => f.id === (isShredded ? 'tuna_shredded_popular_oil' : 'tuna_one_piece_drained'));
      if (m) return m;
    }
    if (segNorm.includes('بيض')) {
      if (segNorm.includes('احمر')) {
        const m = state.foodsDb.find((f) => f.id === 'eggs_red_boiled_2');
        if (m) return m;
      } else if (segNorm.includes('ابيض')) {
        const m = state.foodsDb.find((f) => f.id === 'eggs_white_boiled_2');
        if (m) return m;
      } else if (segNorm.includes('بلدي')) {
        const m = state.foodsDb.find((f) => f.id === 'eggs_baladi_boiled_2');
        if (m) return m;
      }
    }

    const qWords = segNorm.split(/\s+/).filter((w) => w.length >= 2);
    if (qWords.length === 0) return null;

    let bestFood = null;
    let bestScore = 0;

    for (const f of state.foodsDb) {
      const fullTarget = window.normalizeArabic(`${f.name} ${f.restaurantHint || ''} ${f.serving || ''}`);
      const nameOnly = window.normalizeArabic(f.name);
      let score = 0;

      for (const qw of qWords) {
        if (qw.length < 3 && qw !== 'مل') continue;
        if (nameOnly.includes(qw)) {
          score += STOP_WORDS.has(qw) ? 1 : 4;
        } else if (fullTarget.includes(qw)) {
          score += STOP_WORDS.has(qw) ? 0.5 : 2;
        }
      }

      if (score > bestScore && score >= 4) {
        bestScore = score;
        bestFood = f;
      }
    }
    return bestFood;
  }

  // تقسيم الجملة إذا كتب المستخدم أكثر من صنف (مع الحفاظ على "بطاطس على فول")
  const segments = norm
    .replace(/بطاطس علي فول/g, 'بطاطس_علي_فول')
    .split(/(?:\s+و\s+|\s+و|\s+مع\s+|\+|،|,)/)
    .map((s) => s.replace(/بطاطس_علي_فول/g, 'بطاطس علي فول').trim())
    .filter((s) => s.length >= 2);

  const searchUnits = segments.length > 1 ? segments : [norm];
  for (const seg of searchUnits) {
    const match = findBestFoodMatchForSegment(seg);
    if (match && !matchedFoods.some((m) => m.id === match.id) && matchedFoods.length < 5) {
      matchedFoods.push(match);
    }
  }

  // إذا لم ينجح التقسيم في إيجاد تطابق، نبحث بالجملة كاملة
  if (matchedFoods.length === 0) {
    const fullMatch = findBestFoodMatchForSegment(norm);
    if (fullMatch) matchedFoods.push(fullMatch);
  }

  for (const lex of OFFLINE_EGYPTIAN_LEXICON) {
    if (lex.keywords.some((kw) => norm.includes(window.normalizeArabic(kw)))) {
      if (matchedFoods.length < 5) {
        matchedFoods.push({
          id: 'lex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          ...lex,
          officeImpact: lex.gallbladderStatus === 'heavy_fat' ? 'high-coma' : 'moderate',
          expertTip: lex.gallbladderNote
        });
      }
    }
  }

  let quantityMultiplier = 1;
  if (norm.includes('ساندوتشين') || norm.includes('رغيفين') || norm.includes('طبقين') || norm.includes('2 ') || norm.includes('اتنين')) {
    quantityMultiplier = 2;
  } else if (norm.includes('3 ') || norm.includes('تلاته') || norm.includes('ثلاثه')) {
    quantityMultiplier = 3;
  } else if (norm.includes('نص ') && !norm.includes('نص فرخه')) {
    quantityMultiplier = 0.5;
  }

  // تعديل الدهون والسعرات تلقائياً إذا ذكر المستخدم طريقة طبخ دسمة أو خفيفة
  const isExtraFried = norm.includes('مقلي') || norm.includes('محمر') || norm.includes('بالسمنه') || norm.includes('بالزبده') || norm.includes('قشطه');
  const isLightCooked = norm.includes('مسلوق') || norm.includes('بدون زيت') || norm.includes('دايت') || norm.includes('ايرفراير');

  if (matchedFoods.length === 0) {
    const baseFats = isExtraFried ? 20 : isLightCooked ? 7 : 12;
    const baseCal = isExtraFried ? 510 : isLightCooked ? 320 : 410;
    const estMeal = {
      id: 'custom_ai_' + Date.now(),
      name: text.trim().slice(0, 42),
      emoji: '🍽️',
      portionMultiplier: quantityMultiplier,
      restaurantHint: 'حساب الخبير الغذائي الأوفلاين 📴',
      serving: quantityMultiplier === 1 ? 'وجبة متوسطة' : `وجبة × ${quantityMultiplier}`,
      calories: Math.round(baseCal * quantityMultiplier),
      protein: Math.round(18 * quantityMultiplier),
      carbs: Math.round(45 * quantityMultiplier),
      fats: Math.round(baseFats * quantityMultiplier * 10) / 10,
      fiber: Math.round(4.5 * quantityMultiplier * 10) / 10,
      sodium: Math.round(580 * quantityMultiplier),
      iron: Math.round(2.5 * quantityMultiplier * 10) / 10,
      calcium: Math.round(65 * quantityMultiplier),
      potassium: Math.round(410 * quantityMultiplier),
      officeImpact: baseFats > 16 ? 'high-coma' : 'moderate',
      gallbladderStatus: baseFats > state.profile.maxFatPerMeal ? 'heavy_fat' : 'safe',
      gallbladderNote: 'تأكد من أن تكون مطبوخة بدهون خفيفة وأضف معها سلطة أو شوفان لامتصاص العصارة الصفراوية.',
      expertTip: 'تقدر تعدل حجم الحصة بالأزرار بالأسفل أو تضيفها لسجل يومك فوراً بدون إنترنت!'
    };
    return {
      replyText:
        `📴 **حسبتلك تقدير الوجبة أوفلاين لـ "${estMeal.name}":**\n` +
        `• 🔥 السعرات: **${estMeal.calories} سعرة** | 🍗 البروتين: **${estMeal.protein} جم** | 🩺 الدهون: **${estMeal.fats} جم** | 🌾 الألياف: **${estMeal.fiber} جم**.\n` +
        `• 🧪 المعادن: صوديوم **${estMeal.sodium} ملجم** • حديد **${estMeal.iron} ملجم** • كالسيوم **${estMeal.calcium} ملجم** • بوتاسيوم **${estMeal.potassium} ملجم**.\n` +
        `• 🩺 **تقييم المرارة:** ${estMeal.fats > state.profile.maxFatPerMeal ? `الدهون (${estMeal.fats} جم) أعلى من حد الأمان (${state.profile.maxFatPerMeal} جم)؛ قلل الكمية للنصف.` : `الدهون في حدود الأمان (${state.profile.maxFatPerMeal} جم/وجبة) ومريحة للهضم.`}`,
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
      if (f.expertTip) acc.tips.push(f.expertTip);
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
      ? `🔴 **تحذير هام لأنك شايل المرارة:** إجمالي الدهون في هذه الوجبة **${combined.fats} جم** (أعلى من الحد الآمن ${maxSafeFat} جم للوجبة الواحدة!). اقسم الوجبة على مرتين أو اضغط (0.5×) بالأسفل.`
      : `🟢 **آمن لما بعد استئصال المرارة:** الدهون في هذه الوجبة **${combined.fats} جم** فقط (ضمن الحد الآمن ${maxSafeFat} جم/وجبة).`
    : '';

  const parsedMeal = {
    id: 'smart_parsed_' + Date.now(),
    sourceFoodId: matchedFoods.length === 1 ? matchedFoods[0].id : null,
    portionMultiplier: quantityMultiplier,
    name: mealTitle,
    emoji: matchedFoods[0]?.emoji || '🍽️',
    restaurantHint: 'تحليل الخبير المصري الأوفلاين 📴',
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
    expertTip: combined.tips[0] || 'وجبة محسوبة محلياً بدقة.'
  };

  return {
    replyText:
      `📴 **تحليل الخبير الأوفلاين لوجبتك: ${mealTitle}** 🍽️\n` +
      `• 🔥 السعرات: **${combined.calories} سعرة** | 🍗 البروتين: **${combined.protein} جم** | 🩺 الدهون: **${combined.fats} جم** | 🌾 الألياف: **${combined.fiber} جم**\n` +
      `• 🧪 المعادن: صوديوم **${combined.sodium} ملجم** | حديد **${combined.iron} ملجم** | كالسيوم **${combined.calcium} ملجم** | بوتاسيوم **${combined.potassium} ملجم**\n` +
      `${gbEvaluation ? '• ' + gbEvaluation + '\n' : ''}` +
      `${combined.tips[0] ? '• 💡 نصيحة الخبير: ' + combined.tips[0] : ''}`,
    parsedMeal
  };
}

function inferMealTimingFromText(text) {
  const norm = window.normalizeArabic(text || '');
  if (norm.includes('فطرت') || norm.includes('فطار') || norm.includes('الصبح')) return 'فطار';
  if (norm.includes('اتعشيت') || norm.includes('عشا') || norm.includes('بالليل')) return 'عشا';
  if (norm.includes('سناك') || norm.includes('قهوه') || norm.includes('شاي') || norm.includes('فاكهه')) return 'سناك';
  return 'غدا';
}

window.handleSendAiMessage = async function (event) {
  event.preventDefault();
  if (state.pendingAiImage) {
    await triggerPhotoAnalysisNow();
    return;
  }
  const input = document.getElementById('ai-meal-input');
  const text = input?.value?.trim();
  if (!text) return;

  input.value = '';
  const suggestedTiming = inferMealTimingFromText(text);
  state.aiHistory.push({ role: 'user', text });

  // يعمل فوراً 100% أوفلاين بدون انتظار أي شبكة أو API
  const result = localEgyptianMealParser(text);
  if (result.parsedMeal) {
    result.parsedMeal.suggestedTiming = suggestedTiming;
  }
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
  const selectEl = document.getElementById(`ai-meal-type-${index}`);
  const chosenTiming = selectEl?.value || item.parsedMeal.suggestedTiming || 'غدا';
  const entry = {
    ...item.parsedMeal,
    logId: 'log_ai_' + Date.now(),
    multiplier: 1,
    mealTiming: chosenTiming,
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
  getCurrentDayLog().meals.unshift(entry);
  saveState();
  showToast(`تمت إضافة الوجبة المحللة في (${chosenTiming}) لسجل يومك! 🎉`);
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
  const digestionStatus = document.getElementById('prof-digestion-status')?.value || state.profile.digestionStatus || 'normal';
  const moodStatus = document.getElementById('prof-mood-status')?.value || state.profile.moodStatus || 'normal';
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
    digestionStatus,
    moodStatus,
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
  const currLog = getCurrentDayLog();
  currLog.digestionStatus = digestionStatus;
  currLog.moodStatus = moodStatus;

  saveState();
  showToast('تم حفظ ملفك الصحي وحالة الإخراج والحالة النفسية وأهدافك بنجاح! ✅');
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

function showSystemNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: './icon.svg' });
  } catch (e) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body, icon: './icon.svg' }))
        .catch(() => {});
    }
  }
}

window.requestNotificationPermission = async function () {
  if (!('Notification' in window)) {
    showToast('التنبيهات الصوتية والداخلية مفعلة تلقائياً على جهازك 🔔');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('تم تفعيل إشعارات الآيفون/المتصفح بنجاح! 🔔');
    showSystemNotification(
      'خبير التغذية المصري & أكلي 🥗',
      'هفكرك بمواعيد المية، تقسيم الوجبات للمرارة، والحركة والمكملات في وقتها!'
    );
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
  showSystemNotification(rem.title, rem.description);
}

function playGentleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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
    setTimeout(() => {
      if (typeof ctx.close === 'function') ctx.close().catch(() => {});
    }, 700);
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

  const activeDig = getActiveDigestionStatus();
  const activeMood = getActiveMoodStatus();
  const digInfo = window.DIGESTION_STATES.find((d) => d.id === activeDig) || window.DIGESTION_STATES[0];
  const moodInfo = window.MOOD_STATES.find((m) => m.id === activeMood) || window.MOOD_STATES[1];

  const sugFilter = state.suggestionFilter || 'auto';
  const suggestionsData = sugFilter === 'plan' ? null : getPersonalizedMealSuggestions(sugFilter, 4);
  const fullDayPlan = sugFilter === 'plan' ? generateFullDayMealPlan() : null;

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
            p.gallbladderRemoved && (totals.effectiveMaxMealFat || totals.maxSingleMealFat) > p.maxFatPerMeal
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
                    (totals.effectiveMaxMealFat || totals.maxSingleMealFat) > p.maxFatPerMeal
                      ? 'text-rose-300 font-bold'
                      : 'text-emerald-300'
                  }">أقصى وجبة: ${(totals.effectiveMaxMealFat || totals.maxSingleMealFat).toFixed(1)} / ${p.maxFatPerMeal}جم</div>`
                : ''
            }
          </div>
        </div>

        <!-- المعادن والأملاح اليومية (الصوديوم • الحديد • الكالسيوم • البوتاسيوم) -->
        <div class="grid grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-white/10 text-center">
          <div class="bg-slate-900/40 px-2 py-1.5 rounded-lg border ${
            totals.sodium > (targets.sodiumMax || 2200) * 0.8 ? 'border-rose-500/40' : 'border-white/5'
          }">
            <div class="text-[10px] text-slate-400">صوديوم 🧂</div>
            <div class="text-[11px] font-extrabold ${
              totals.sodium > (targets.sodiumMax || 2200) * 0.8 ? 'text-rose-300' : 'text-white'
            }">${totals.sodium} <span class="text-[9px] font-normal text-slate-400">/${targets.sodiumMax || 2200}</span></div>
          </div>
          <div class="bg-slate-900/40 px-2 py-1.5 rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400">حديد ⚡</div>
            <div class="text-[11px] font-extrabold text-emerald-300">${totals.iron.toFixed(1)} <span class="text-[9px] font-normal text-slate-400">/${targets.iron || 14}ملجم</span></div>
          </div>
          <div class="bg-slate-900/40 px-2 py-1.5 rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400">كالسيوم 🦴</div>
            <div class="text-[11px] font-extrabold text-sky-300">${totals.calcium} <span class="text-[9px] font-normal text-slate-400">/${targets.calcium || 1000}</span></div>
          </div>
          <div class="bg-slate-900/40 px-2 py-1.5 rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400">بوتاسيوم 🍌</div>
            <div class="text-[11px] font-extrabold text-amber-300">${totals.potassium} <span class="text-[9px] font-normal text-slate-400">/${targets.potassium || 3000}</span></div>
          </div>
        </div>
      </div>

      <!-- حالة الإخراج والهضم + حالة الشعور النفسي (مرتبطة بالنظام واقتراحات الأكل) -->
      <div class="glass-card p-4 space-y-3 border border-emerald-500/30">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-extrabold text-white">🩺🧠 حالتك الهضمية والنفسية النهاردة</h3>
            <p class="text-[10px] text-slate-300">اختيارك هنا يغير النظام واقتراحات الوجبات وحد دهون المرارة تلقائياً</p>
          </div>
          <button onclick="switchTab('ai')" class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
            💬 استشر الخبير
          </button>
        </div>

        <!-- 1. حالة الإخراج -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-emerald-300">🚽 حالة الإخراج والقولون:</span>
            <span class="text-slate-300 text-[10px]">${digInfo.icon} ${digInfo.label}</span>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            ${window.DIGESTION_STATES.map(
              (st) => `
              <button
                type="button"
                onclick="updateDigestionStatus('${st.id}')"
                class="ios-btn py-2 px-1.5 rounded-xl text-[10px] font-bold border text-center transition-all ${
                  activeDig === st.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                    : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                }"
              >
                <div class="text-sm">${st.icon}</div>
                <div class="mt-0.5">${st.label}</div>
              </button>
            `
            ).join('')}
          </div>
        </div>

        <!-- 2. حالة الشعور النفسي والطاقة -->
        <div class="space-y-1.5 pt-1 border-t border-white/10">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-sky-300">🧠 الشعور النفسي والطاقة:</span>
            <span class="text-slate-300 text-[10px]">${moodInfo.icon} ${moodInfo.label}</span>
          </div>
          <div class="grid grid-cols-5 gap-1">
            ${window.MOOD_STATES.map(
              (m) => `
              <button
                type="button"
                onclick="updateMoodStatus('${m.id}')"
                class="ios-btn py-2 px-1 rounded-xl text-[10px] font-bold border text-center transition-all ${
                  activeMood === m.id
                    ? 'bg-sky-400 text-slate-950 border-sky-300 shadow'
                    : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                }"
              >
                <div class="text-sm">${m.icon}</div>
                <div class="mt-0.5 leading-tight">${m.label.split(' ')[0]}</div>
              </button>
            `
            ).join('')}
          </div>
        </div>

        <!-- ملخص تكييف النظام الحالي -->
        <div class="bg-slate-900/80 p-2.5 rounded-xl border border-white/10 text-[11px] text-slate-200 space-y-1">
          <div><strong class="text-emerald-300">${digInfo.icon} الإخراج (${digInfo.label}):</strong> ${digInfo.systemNote}</div>
          <div><strong class="text-sky-300">${moodInfo.icon} الشعور (${moodInfo.label}):</strong> ${moodInfo.systemNote}</div>
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

      <!-- اقتراحات الوجبات والأكل الذكية بناءً على النظام والمرارة وحالة الإخراج والحالة النفسية -->
      <div class="glass-card p-4 space-y-3 border border-emerald-500/35">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-white">🎯 اقتراحات وجبات مفصلة لنظامك وحالتك</h3>
            <p class="text-[10px] text-slate-300 mt-0.5">
              مضبوطة على: ${p.goal === 'fat_loss' ? 'نزول الوزن' : p.goal === 'muscle' ? 'زيادة العضلات' : 'تنظيم الأكل'} • الإخراج (${digInfo.label}) • الشعور (${moodInfo.label})
            </p>
          </div>
        </div>

        <!-- فلاتر توقيت الاقتراحات أو جدول يوم كامل -->
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          ${[
            { id: 'auto', label: '⚡ مقترح الآن' },
            { id: 'فطار', label: '🥙 فطار' },
            { id: 'غدا', label: '🍗 غدا' },
            { id: 'عشا', label: '🥣 عشا' },
            { id: 'سناك', label: '🍎 سناك' },
            { id: 'plan', label: '📅 جدول يوم كامل' }
          ]
            .map(
              (tab) => `
            <button
              type="button"
              onclick="setSuggestionFilter('${tab.id}')"
              class="ios-btn whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                sugFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                  : 'bg-slate-900/80 text-slate-300 border-white/10'
              }"
            >
              ${tab.label}
            </button>
          `
            )
            .join('')}
        </div>

        ${
          sugFilter === 'plan' && fullDayPlan
            ? `
          <div class="space-y-2.5">
            <div class="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between text-[11px]">
              <span class="text-emerald-300 font-bold">📊 إجمالي جدول اليوم المقترح:</span>
              <span class="text-white font-extrabold">${fullDayPlan.totalCal} سعرة • ${fullDayPlan.totalProt.toFixed(0)}جم بروتين • ${fullDayPlan.totalFiber.toFixed(1)}جم ألياف</span>
            </div>
            ${fullDayPlan.plan
              .map(
                (item) => `
              <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                <div class="flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold">${item.slot}</span>
                    <span class="text-xs font-extrabold text-white">${item.food.emoji || '🍽️'} ${item.food.name}</span>
                  </div>
                  <div class="text-[10px] text-slate-300 mt-1">
                    🔥 ${item.food.calories} سعرة • 🍗 ${item.food.protein}جم بروتين • 🌾 ${item.food.fiber}جم ألياف • 🩺 ${item.food.fats}جم دهون
                  </div>
                  <div class="text-[10px] text-emerald-300 mt-0.5">✓ ${item.reasons.join(' • ')}</div>
                </div>
                <button
                  onclick="addMealToLog('${item.food.id}', 1, '${item.slot}')"
                  class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-[11px] px-3 py-2 rounded-xl whitespace-nowrap"
                >
                  + سجل (${item.slot})
                </button>
              </div>
            `
              )
              .join('')}
            <button
              onclick="applySuggestedDayPlan()"
              class="ios-btn w-full bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400/40 font-extrabold text-xs py-2.5 rounded-xl"
            >
              ➕ سجل جدول وجبات اليوم الكامل في يومياتي الآن
            </button>
          </div>
        `
            : `
          <div class="space-y-2.5">
            ${(suggestionsData?.items || [])
              .map(
                (item) => `
              <div class="bg-slate-900/80 p-3 rounded-2xl border border-white/10 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                        مقترح لـ (${suggestionsData.effectiveTiming})
                      </span>
                      <span class="text-[10px] text-slate-400">${item.food.serving}</span>
                    </div>
                    <h4 class="text-xs font-extrabold text-white mt-1">${item.food.emoji || '🍽️'} ${item.food.name}</h4>
                  </div>
                  <button
                    onclick="addMealToLog('${item.food.id}', 1, '${suggestionsData.effectiveTiming}')"
                    class="ios-btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] px-3 py-2 rounded-xl whitespace-nowrap shadow"
                  >
                    ＋ سجل الوجبة
                  </button>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-xl">
                  <span>🔥 <strong>${item.food.calories}</strong> سعرة</span>
                  <span>•</span>
                  <span class="text-sky-300">🍗 <strong>${item.food.protein}جم</strong> بروتين</span>
                  <span>•</span>
                  <span class="text-emerald-300">🌾 <strong>${item.food.fiber}جم</strong> ألياف</span>
                  <span>•</span>
                  <span class="text-purple-300">🩺 <strong>${item.food.fats}جم</strong> دهون</span>
                </div>
                <div class="text-[10px] text-emerald-300 font-semibold">
                  💡 لماذا يناسبك الآن؟ ${item.reasons.join(' • ')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
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
            value="${escapeHtml(state.searchQuery)}"
            oninput="handleSearchInput(this.value)"
            placeholder="دور على بطاطس، فول، تونة، جبنة رومي، شيدر سايبة، بيض، قهوة، فيوري، بيبسي، بيتي، جهينة..."
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

// ===== 4. واجهة الخبير الذكي الأوفلاين (يعمل 100% بدون إنترنت وبدون API Key) =====
function renderAiExpertView() {
  const digInfo = window.DIGESTION_STATES.find((d) => d.id === getActiveDigestionStatus()) || window.DIGESTION_STATES[0];
  const moodInfo = window.MOOD_STATES.find((m) => m.id === getActiveMoodStatus()) || window.MOOD_STATES[1];

  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card-highlight p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-base font-extrabold text-white flex items-center gap-2">
            <span>🤖📸</span>
            <span>الخبير الغذائي وكاميرا الأكل</span>
          </h2>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bold">
            📴 يعمل 100% بدون نت
          </span>
        </div>
        <p class="text-xs text-slate-300 mt-1">
          يعمل بالكامل على جهازك **بدون إنترنت وبدون API Key**: صوّر طبقك بالكاميرا أو كلمني بالعامية عن أكلك أو حالتك (الإخراج: <strong>${digInfo.label}</strong> • الشعور: <strong>${moodInfo.label}</strong>)، وهحسبلك السعرات والماكروز والمعادن وأمان المرارة في نفس اللحظة!
        </p>
      </div>

      <!-- قسم تصوير أو رفع صورة الأكل لحساب السعرات والعناصر الغذائية 100% أوفلاين -->
      <div class="glass-card p-3.5 space-y-2.5 border border-emerald-500/40">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-emerald-300">📸 صوّر وجبتك لحساب السعرات والعناصر (بدون نت)</span>
          <span class="text-[10px] text-sky-300 font-bold">تحليل بصري فوري 📴</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="ios-btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg">
            <span>📷</span>
            <span>صوّر الأكل بالكاميرا</span>
            <input type="file" accept="image/*" capture="environment" onchange="handleFoodPhotoSelected(event)" class="hidden" />
          </label>
          <label class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
            <span>🖼️</span>
            <span>اختر صورة من الموبايل</span>
            <input type="file" accept="image/*" onchange="handleFoodPhotoSelected(event)" class="hidden" />
          </label>
        </div>
        <p class="text-[10px] text-slate-400">
          💡 يحلل ألوان الطبق مباشرة على جهازك بدون إرسال صورك للإنترنت، ويمكنك تعديل الحصة أو اختيار الصنف بضغطة زر!
        </p>
      </div>

      <!-- نموذج المحادثة والاستشارة مع الخبير الغذائي الأوفلاين -->
      <form onsubmit="handleSendAiMessage(event)" class="glass-card p-3.5 space-y-2.5">
        <label class="block text-xs font-bold text-emerald-300">💬 كلم الخبير الغذائي أو اكتب وجبتك بالعامية (أوفلاين):</label>
        <textarea
          id="ai-meal-input"
          rows="2"
          placeholder="مثال: ساندوتش بطاطس على فول وكوباية قهوة وسط 200 مل... أو: جبنة شيدر سايبة بتاعة بيت الجملة وتونة... أو: فيوري وبيبسي وعصير بيتي..."
          class="w-full bg-slate-900/90 text-white text-xs rounded-xl p-3 border border-white/15 focus:outline-none focus:border-emerald-400"
        ></textarea>

        <!-- أزرار سريعة للاستشارة عن الإخراج والمزاج وأكلات الشارع والسوبر ماركت أوفلاين -->
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="document.getElementById('ai-meal-input').value='اقترحلي وجبة تناسب نظامي وحالتي دلوقتي'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
            🎯 اقترحلي وجبة الآن
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='فطرت ساندوتش بطاطس صوابع وساندوتش فول وكوباية قهوة وسط 200 مل'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg">
            🍟☕ ساندوتش بطاطس وفول وقهوة 200مل
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='جبنة شيدر سايبة شعبي بتاعة بيت الجملة وجبنة رومي'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300 px-2.5 py-1 rounded-lg">
            🧀 جبنة شيدر سايبة (بيت الجملة) ورومي
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='علبة تونة وبيضتين بلدي وفنجان قهوة 75 مل'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 px-2.5 py-1 rounded-lg">
            🥫🥚 تونة وبيض بلدي وفنجان قهوة
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='شربت فيوري أو بيبسي أو عصير جهينة وبيتي'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-purple-300 px-2.5 py-1 rounded-lg">
            ⚡🧃 فيوري وبيبسي وعصير بيتي/جهينة
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='عندي إمساك آكل إيه يريح بطني؟'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg">
            🟠 عندي إمساك آكل إيه؟
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='عندي إسهال بعد المرارة أتصرف إزاي وآكل إيه؟'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300 px-2.5 py-1 rounded-lg">
            🔴 عندي إسهال بعد المرارة
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='حاسس بخمول وكسل في الشغل آكل إيه يديني طاقة؟'; document.getElementById('ai-send-btn').click()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 px-2.5 py-1 rounded-lg">
            😴 حاسس بخمول وكسل
          </button>
        </div>
        <button
          id="ai-send-btn"
          type="submit"
          class="ios-btn w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg"
        >
          ⚡ حلل فوراً بدون إنترنت
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
              ${msg.role === 'user' ? '👤 أنت' : '👨‍⚕️ الخبير الغذائي المصري (أوفلاين 📴)'}
            </div>
            ${
              msg.imageUrl
                ? `<div class="mb-2.5">
                    <img src="${msg.imageUrl}" alt="صورة الوجبة" class="w-44 h-32 object-cover rounded-xl border border-emerald-400/40 shadow" />
                  </div>`
                : ''
            }
            <div class="text-xs text-slate-100 whitespace-pre-line leading-relaxed">${msg.text}</div>
            ${
              msg.parsedMeal
                ? `
              <div class="mt-3 bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30 space-y-2.5">
                <div class="flex justify-between items-center gap-2">
                  <span class="text-xs font-extrabold text-emerald-300">${msg.parsedMeal.emoji || '🍽️'} ${msg.parsedMeal.name}</span>
                  <span class="text-[10px] text-slate-400">${msg.parsedMeal.serving}</span>
                </div>
                <div class="grid grid-cols-5 gap-1 text-center text-[11px] bg-slate-900 p-2 rounded-lg">
                  <div><span class="text-slate-400 block text-[9px]">سعرات</span><strong>${msg.parsedMeal.calories}</strong></div>
                  <div><span class="text-sky-300 block text-[9px]">بروتين</span><strong>${msg.parsedMeal.protein}جم</strong></div>
                  <div><span class="text-emerald-300 block text-[9px]">ألياف</span><strong>${msg.parsedMeal.fiber}جم</strong></div>
                  <div><span class="text-amber-300 block text-[9px]">كارب</span><strong>${msg.parsedMeal.carbs}جم</strong></div>
                  <div><span class="text-purple-300 block text-[9px]">دهون 🩺</span><strong class="${msg.parsedMeal.fats > state.profile.maxFatPerMeal ? 'text-rose-400' : 'text-purple-300'}">${msg.parsedMeal.fats}جم</strong></div>
                </div>
                <!-- المعادن المحسوبة للوجبة -->
                <div class="grid grid-cols-4 gap-1 text-center text-[10px] bg-slate-900/60 px-2 py-1.5 rounded-lg border border-white/5">
                  <div>🧂 صوديوم: <strong>${msg.parsedMeal.sodium || 450}</strong></div>
                  <div>⚡ حديد: <strong>${msg.parsedMeal.iron || 2.5}ملجم</strong></div>
                  <div>🦴 كالسيوم: <strong>${msg.parsedMeal.calcium || 60}</strong></div>
                  <div>🍌 بوتاسيوم: <strong>${msg.parsedMeal.potassium || 380}</strong></div>
                </div>

                <!-- التحكم الفوري في حجم الحصة (0.5×، 1×، 1.5×، 2×) بدون إنترنت -->
                <div class="flex items-center justify-between gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                  <span class="text-[10px] text-slate-300 font-bold px-1.5">⚖️ حجم الحصة:</span>
                  <div class="flex gap-1">
                    ${[
                      { m: 0.5, label: 'نصف (0.5×)' },
                      { m: 1, label: 'عادية (1×)' },
                      { m: 1.5, label: 'كبيرة (1.5×)' },
                      { m: 2, label: 'حصتين (2×)' }
                    ]
                      .map(
                        (pBtn) => `
                      <button
                        type="button"
                        onclick="changeAiMealPortion(${idx}, ${pBtn.m})"
                        class="text-[10px] px-2 py-1 rounded-lg font-bold border ${
                          Number(msg.parsedMeal.portionMultiplier || 1) === pBtn.m
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                            : 'bg-slate-800 text-slate-300 border-white/10'
                        }"
                      >
                        ${pBtn.label}
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>

                ${
                  Array.isArray(msg.parsedMeal.photoAlternatives) && msg.parsedMeal.photoAlternatives.length > 0
                    ? `
                  <div class="space-y-1.5 pt-1 border-t border-white/10">
                    <span class="text-[10px] text-emerald-300 font-bold block">🔄 الأطباق الأقرب للصورة (اضغط للتبديل الفوري أو اختر من القائمة):</span>
                    <div class="flex flex-wrap gap-1">
                      ${msg.parsedMeal.photoAlternatives
                        .map(
                          (alt) => `
                        <button
                          type="button"
                          onclick="switchPhotoDetectedFood(${idx}, '${alt.id}')"
                          class="text-[10px] px-2 py-1 rounded-lg border ${
                            msg.parsedMeal.sourceFoodId === alt.id
                              ? 'bg-emerald-500 text-slate-950 font-extrabold border-emerald-300'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                          }"
                        >
                          ${alt.emoji} ${alt.name}
                        </button>
                      `
                        )
                        .join('')}
                    </div>
                    <select
                      onchange="if(this.value) switchPhotoDetectedFood(${idx}, this.value)"
                      aria-label="اختر طبق آخر من الموسوعة"
                      class="w-full bg-slate-900 text-slate-200 text-[11px] rounded-xl px-2.5 py-2 border border-white/15"
                    >
                      <option value="">📋 أو اختر أي أكلة مصرية من الموسوعة لتطبيقها على الصورة...</option>
                      ${state.foodsDb
                        .map(
                          (fItem) =>
                            `<option value="${fItem.id}" ${msg.parsedMeal.sourceFoodId === fItem.id ? 'selected' : ''}>${fItem.emoji || '🍽️'} ${fItem.name} (${fItem.calories} سعرة • ${fItem.fats}جم دهون)</option>`
                        )
                        .join('')}
                    </select>
                  </div>
                `
                    : ''
                }
                <div class="flex items-center gap-2 pt-1">
                  <select
                    id="ai-meal-type-${idx}"
                    aria-label="نوع الوجبة"
                    class="bg-slate-900 text-white text-xs rounded-xl px-2.5 py-2 border border-white/15"
                  >
                    ${window.MEAL_TYPES.map(
                      (mt) =>
                        `<option value="${mt}" ${(msg.parsedMeal.suggestedTiming || 'غدا') === mt ? 'selected' : ''}>${mt}</option>`
                    ).join('')}
                  </select>
                  <button
                    onclick="addAiParsedMeal(${idx})"
                    class="ios-btn flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2 rounded-xl shadow"
                  >
                    + أضف لسجل يومي الآن
                  </button>
                </div>
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
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
              <input id="prof-name" type="text" value="${escapeHtml(p.name)}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-slate-300 font-bold block mb-1">طبيعة الشغل</label>
              <input id="prof-workstyle" type="text" value="${escapeHtml(p.workStyle)}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
          </div>
          <div>
            <label class="text-[11px] text-slate-300 font-bold block mb-1">أكلك غالباً منين؟</label>
            <input id="prof-foodsource" type="text" value="${escapeHtml(p.foodSource || 'مطاعم وأكل شارع')}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
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

        <!-- قسم الحالة الطبية والهضمية والنفسية (استئصال المرارة، الإخراج، والمزاج) -->
        <div class="bg-sky-950/30 p-3.5 rounded-2xl border border-sky-500/30 space-y-2.5">
          <h3 class="text-xs font-extrabold text-sky-300">🩺🧠 الحالة الصحية، الإخراج، والشعور النفسي (مرتبطة بالنظام)</h3>

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

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-emerald-300 font-bold block mb-1">🚽 حالة الإخراج الحالية</label>
              <select id="prof-digestion-status" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2.5 py-2 border border-emerald-500/40">
                ${window.DIGESTION_STATES.map(
                  (d) => `<option value="${d.id}" ${getActiveDigestionStatus() === d.id ? 'selected' : ''}>${d.icon} ${d.label}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="text-[11px] text-sky-300 font-bold block mb-1">🧠 الشعور النفسي والطاقة</label>
              <select id="prof-mood-status" class="w-full bg-slate-900 text-white text-xs rounded-xl px-2.5 py-2 border border-sky-500/40">
                ${window.MOOD_STATES.map(
                  (m) => `<option value="${m.id}" ${getActiveMoodStatus() === m.id ? 'selected' : ''}>${m.icon} ${m.label}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-sky-300 font-bold block mb-1">الحد الأقصى الآمن للدهون في الوجبة الواحدة (جم)</label>
            <input id="prof-max-meal-fat" type="number" step="1" value="${p.maxFatPerMeal}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-sky-500/40" />
          </div>

          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">ملاحظاتك الصحية الخاصة</label>
            <textarea id="prof-med-notes" rows="2" class="w-full bg-slate-900 text-white text-xs rounded-xl p-2.5 border border-white/15">${escapeHtml(p.medicalNotes || '')}</textarea>
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
