// المنطق الرئيسي لتطبيق خبير التغذية المصري - نسخة الشغل المكتبي وما بعد استئصال المرارة (مع بيانات قابلة للتعديل الكامل)

const STORAGE_KEY = 'egy_nutritionist_state_v2';

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

const DEFAULT_STATE = {
  currentDate: getTodayDateString(),
  activeTab: 'dashboard', // 'dashboard' | 'foods' | 'ai' | 'supplements' | 'profile'
  selectedCategory: 'all',
  searchQuery: '',
  profile: {
    name: 'بطل الشغل المكتبي',
    weight: 82,
    height: 175,
    age: 29,
    workStyle: 'شغل مكتبي / ريموت (جلوس طويل + دليفري)',
    goal: 'fat_loss', // 'fat_loss' | 'maintain' | 'muscle'
    gallbladderRemoved: true, // شايل المرارة (قابل للتعديل)
    colonSensitive: true, // حساسية القولون والانتفاخات (قابل للتعديل)
    maxFatPerMeal: 14, // الحد الأقصى الآمن للدهون في الوجبة الواحدة لمن أزال المرارة (جم)
    medicalNotes: 'شايل المرارة: أحتاج تقسيم الدهون على مدار اليوم، تجنب المقليات والتومية الثقيلة، والتركيز على الألياف الذائبة.',
    targets: {
      calories: 1900,
      protein: 135,
      carbs: 205,
      fats: 55, // دهون يومية أقل وموزعة لراحة الكبد بعد شيل المرارة
      fiber: 32, // ألياف أعلى لربط العصارة الصفراوية
      sodiumMax: 2200,
      iron: 14,
      calcium: 1000,
      potassium: 3000,
      waterCups: 10,
      stretchBreaks: 6
    }
  },
  todayLog: {
    meals: [],
    waterCups: 0,
    stretchBreaks: 0,
    supplementsTaken: {}
  },
  foodsDb: null, // يتم تحميلها من EGYPTIAN_FOODS_DB وتصبح قابلة للتعديل والإضافة
  supplementsList: null, // يتم تحميلها من DEFAULT_SUPPLEMENTS وتصبح قابلة للتعديل الكامل
  reminders: null, // يتم تحميلها من DEFAULT_REMINDERS وتصبح قابلة للتعديل الكامل
  geminiApiKey: '',
  aiHistory: [
    {
      role: 'assistant',
      text: 'أهلاً بك يا بطل! 👨‍💻🩺 أنا خبيرك الغذائي المصري، ومبرمج في ملفك الصحي إنك **شايل المرارة** وشغلك **مكتبي**. هراقبلك مش بس السعرات والألياف، لكن كمان **كمية الدهون في كل وجبة لوحدها** عشان ما تتعداش الحد الآمن للكبد، وهفكرك بالإنزيمات الهاضمة والألياف الذائبة اللي بتمنع المغص والحموضة والخمول. (كل البيانات والأكلات والمكملات قابلة للتعديل في أي وقت!)',
      parsedMeal: null
    }
  ]
};

let state = loadState();
let reminderTimers = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = structuredClone(DEFAULT_STATE);
    base.foodsDb = structuredClone(window.EGYPTIAN_FOODS_DB || []);
    base.supplementsList = structuredClone(window.DEFAULT_SUPPLEMENTS || []);
    base.reminders = structuredClone(window.DEFAULT_REMINDERS || []);

    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const today = getTodayDateString();

    if (parsed.currentDate !== today) {
      parsed.currentDate = today;
      parsed.todayLog = {
        meals: [],
        waterCups: 0,
        stretchBreaks: 0,
        supplementsTaken: {}
      };
    }

    return {
      ...base,
      ...parsed,
      profile: {
        ...base.profile,
        ...(parsed.profile || {}),
        targets: {
          ...base.profile.targets,
          ...(parsed.profile?.targets || {})
        }
      },
      foodsDb: Array.isArray(parsed.foodsDb) && parsed.foodsDb.length > 0 ? parsed.foodsDb : base.foodsDb,
      supplementsList:
        Array.isArray(parsed.supplementsList) && parsed.supplementsList.length > 0
          ? parsed.supplementsList
          : base.supplementsList,
      reminders:
        Array.isArray(parsed.reminders) && parsed.reminders.length > 0 ? parsed.reminders : base.reminders
    };
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

function getTodayTotals() {
  return state.todayLog.meals.reduce(
    (acc, item) => {
      const m = Number(item.multiplier || 1);
      const mealFat = Math.round((item.fats || 0) * m * 10) / 10;
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

// تشخيص الخبير الذكي (يشمل حالة استئصال المرارة + الألياف + الشغل المكتبي)
function getSmartOfficeDiagnosis(totals) {
  const t = state.profile.targets;
  const p = state.profile;
  const alerts = [];

  // 1. فحص خاص باستئصال المرارة (كمية الدهون في الوجبة الواحدة!)
  if (p.gallbladderRemoved) {
    const maxSafeFat = Number(p.maxFatPerMeal || 14);
    if (totals.maxSingleMealFat > maxSafeFat) {
      alerts.push({
        type: 'danger',
        icon: '🩺',
        title: `تنبيه المرارة: وجبة دسمة تجاوزت ${maxSafeFat} جم دهون!`,
        message: `وجبة "${totals.heaviestFatMealName}" فيها ${totals.maxSingleMealFat} جم دهون دفعة واحدة! لأنك شايل المرارة، الكبد يفرز العصارة الصفراوية ببطء ولا يستطيع هضم هذه الكمية مرة واحدة. الحل الآن: خذ كبسولة إنزيمات هاضمة/أملاح صفراء، كُل تفاحة أو شوفان أو سلطة (ألياف ذائبة لربط الصفراء)، واشرب ماء دافئ.`,
        actionLabel: 'عرض الأكلات المريحة بدون مرارة',
        actionTab: 'foods',
        actionCategory: 'gallbladder_safe'
      });
    } else if (state.todayLog.meals.length > 0) {
      alerts.push({
        type: 'success',
        icon: '🩺',
        title: 'حالة الهضم بعد استئصال المرارة: آمنة وممتازة 💚',
        message: `أعلى كمية دهون في وجبة واحدة النهاردة هي ${totals.maxSingleMealFat} جم (أقل من حد الأمان ${maxSafeFat} جم/وجبة). استمر في تقسيم وجباتك وأكل الألياف الذائبة!`
      });
    }
  }

  // 2. فحص الألياف مقارنة بالسعرات
  const calRatio = totals.calories / Math.max(t.calories, 1);
  const fiberRatio = totals.fiber / Math.max(t.fiber, 1);

  if (totals.calories > 400 && fiberRatio < calRatio * 0.65) {
    alerts.push({
      type: 'warning',
      icon: '🥗',
      title: 'تنبيه نقص الألياف (مهم للمرارة والشغل المكتبي)!',
      message: `أخدت ${totals.calories} سعرة لكن الألياف ${totals.fiber.toFixed(1)} جم فقط (الهدف ${t.fiber} جم). الألياف الذائبة ضرورية جداً لامتصاص العصارة الصفراوية الزائدة ومنع إسهال المرارة والخمول المكتبي!`,
      actionLabel: 'أضف رافع ألياف سريع الآن',
      actionTab: 'foods',
      actionCategory: 'fiber_boosters'
    });
  }

  // 3. فحص الصوديوم
  if (totals.sodium > t.sodiumMax * 0.8) {
    alerts.push({
      type: 'danger',
      icon: '🧂',
      title: 'الصوديوم والأملاح عالية النهاردة!',
      message: `وصلت لـ ${totals.sodium} ملجم صوديوم. اشرب كوبايتين مية فوراً وكل خيار أو جرجير لمنع احتباس السوائل والصداع.`
    });
  }

  // 4. فحص المكملات (الإنزيمات الهاضمة وفيتامين د3 وأوميجا 3)
  const takenCount = state.supplementsList.filter((s) => state.todayLog.supplementsTaken[s.id]).length;
  if (totals.calories > 250 && takenCount === 0) {
    alerts.push({
      type: 'info',
      icon: '💊',
      title: p.gallbladderRemoved
        ? 'تذكير مكملات ما بعد المرارة والشغل المكتبي!'
        : 'لا تنسَ مكملات الشغل المكتبي!',
      message: p.gallbladderRemoved
        ? 'طالما أكلت، تذكر أخذ الإنزيمات الهاضمة مع فيتامين د3 + ك2 وأوميجا 3 لضمان امتصاص الفيتامينات الذائبة في الدهون.'
        : 'ده أنسب وقت تاخد فيتامين د3 وأوميجا 3 بعد الأكل لرفع تركيزك.',
      actionLabel: 'سجل أو عدل مكملاتك الآن',
      actionTab: 'supplements'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      icon: '👨‍⚕️',
      title: p.gallbladderRemoved
        ? 'نظامك مضبوط على: شغل مكتبي + شايل المرارة 🩺'
        : 'خبيرك الغذائي يتابع معك خطوة بخطوة',
      message: 'اختر أكلتك من المنيو المصري أو فلتر "مريح بدون مرارة 💚"، وتذكر أن جميع البيانات والأكلات والمكملات قابلة للتعديل بضغطة زر!'
    });
  }

  return alerts;
}

// إضافة أكلة لسجل اليوم
window.addMealToLog = function (foodId, multiplier = 1, mealTiming = 'وجبة اليوم') {
  const food = state.foodsDb.find((f) => f.id === foodId);
  if (!food) return;
  const mealFat = Math.round((food.fats || 0) * Number(multiplier) * 10) / 10;
  const entry = {
    ...structuredClone(food),
    logId: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    multiplier: Number(multiplier),
    mealTiming,
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
  state.todayLog.meals.unshift(entry);
  saveState();

  if (state.profile.gallbladderRemoved && mealFat > state.profile.maxFatPerMeal) {
    showToast(`⚠️ تنبيه المرارة: هذه الحصة تحتوي ${mealFat} جم دهون! يفضل تقليل الكمية أو أخذ إنزيمات هاضمة.`);
  } else {
    showToast(`تم تسجيل "${food.name}" بنجاح ✅`);
  }
  renderApp();
};

window.removeMealFromLog = function (logId) {
  state.todayLog.meals = state.todayLog.meals.filter((m) => m.logId !== logId);
  saveState();
  showToast('تم حذف الوجبة من سجل اليوم');
  renderApp();
};

// ===== نافذة التعديل الشاملة (Universal Edit Modal) لجعل كل البيانات قابلة للتعديل =====
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
  const meal = state.todayLog.meals.find((m) => m.logId === logId);
  if (!meal) return;
  const mult = Number(meal.multiplier || 1);
  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">✏️ تعديل بيانات الوجبة المسجلة</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveEditedLoggedMeal(event, '${meal.logId}')" class="space-y-2.5 text-xs">
      <div>
        <label class="text-slate-300 font-bold block mb-1">اسم الوجبة</label>
        <input id="edit-log-name" type="text" value="${meal.name}" required class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
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
  const meal = state.todayLog.meals.find((m) => m.logId === logId);
  if (!meal) return;
  meal.name = document.getElementById('edit-log-name').value.trim();
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

// 2. تعديل أو إضافة أكلة في موسوعة الأكل المصري (Editable Food Database)
window.openEditFoodDbModal = function (foodId = null) {
  const isNew = !foodId;
  const food = isNew
    ? {
        id: 'custom_food_' + Date.now(),
        name: '',
        category: 'home_traditional',
        restaurantHint: 'أكلة مخصصة',
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
        officeImpact: 'energizing',
        gallbladderStatus: 'safe',
        gallbladderNote: 'دهون معتدلة ومناسبة لمن أزال المرارة.',
        expertTip: 'وجبة متوازنة للشغل المكتبي.'
      }
    : state.foodsDb.find((f) => f.id === foodId);

  if (!food) return;

  openModal(`
    <div class="flex justify-between items-center border-b border-white/10 pb-2">
      <h3 class="text-sm font-extrabold text-emerald-300">${isNew ? '➕ إضافة أكلة مصرية جديدة للمنيو' : '✏️ تعديل بيانات الأكلة في المنيو'}</h3>
      <button onclick="closeModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
    </div>
    <form onsubmit="saveFoodDbItem(event, '${food.id}', ${isNew})" class="space-y-2.5 text-xs">
      <div>
        <label class="text-slate-300 font-bold block mb-1">اسم الأكلة</label>
        <input id="db-food-name" type="text" value="${food.name}" required placeholder="مثلاً: طاجن بامية باللحمة المفرومة" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">المطعم / المصدر</label>
          <input id="db-food-rest" type="text" value="${food.restaurantHint}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
        <div>
          <label class="text-slate-300 font-bold block mb-1">حجم الحصة</label>
          <input id="db-food-serving" type="text" value="${food.serving}" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-slate-300 font-bold block mb-1">القسم</label>
          <select id="db-food-cat" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15">
            ${window.EGYPTIAN_FOOD_CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'gallbladder_safe')
              .map((c) => `<option value="${c.id}" ${food.category === c.id ? 'selected' : ''}>${c.name}</option>`)
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
  const updated = {
    id: foodId,
    name: document.getElementById('db-food-name').value.trim(),
    restaurantHint: document.getElementById('db-food-rest').value.trim(),
    serving: document.getElementById('db-food-serving').value.trim(),
    category: document.getElementById('db-food-cat').value,
    gallbladderStatus: document.getElementById('db-food-gb-status').value,
    calories: Number(document.getElementById('db-food-cal').value) || 0,
    protein: Number(document.getElementById('db-food-prot').value) || 0,
    fiber: Number(document.getElementById('db-food-fiber').value) || 0,
    carbs: Number(document.getElementById('db-food-carbs').value) || 0,
    fats: Number(document.getElementById('db-food-fats').value) || 0,
    sodium: 500,
    iron: 2.5,
    calcium: 60,
    potassium: 400,
    officeImpact: Number(document.getElementById('db-food-fats').value) > 20 ? 'high-coma' : 'energizing',
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
  showToast(isNew ? 'تمت إضافة الأكلة الجديدة للمنيو بنجاح! 🍽️' : 'تم حفظ تعديلات الأكلة بنجاح! ✅');
  renderApp();
};

window.deleteFoodDbItem = function (foodId) {
  state.foodsDb = state.foodsDb.filter((f) => f.id !== foodId);
  saveState();
  closeModal();
  showToast('تم حذف الأكلة من المنيو');
  renderApp();
};

// 3. تعديل أو إضافة أي مكمل غذائي (الافتراضي أو المخصص)
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
  delete state.todayLog.supplementsTaken[suppId];
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
        <input id="edit-rem-title" type="text" value="${rem.title}" required placeholder="مثلاً: أخذ كبسولة الإنزيمات الهاضمة" class="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/15" />
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

// تحديث الماء والحركة
window.updateHabit = function (key, delta) {
  const next = Math.max(0, (state.todayLog[key] || 0) + delta);
  state.todayLog[key] = next;
  saveState();
  if (delta > 0 && key === 'waterCups') {
    showToast('عاش يا بطل! المية بتخفف العصارة الصفراوية وترفع التركيز 💧');
  } else if (delta > 0 && key === 'stretchBreaks') {
    showToast('ممتاز! دقيقتين حركة بتريح القولون والظهر وتشغل الحرق 🚶‍♂️');
  }
  renderApp();
};

window.toggleSupplement = function (suppId) {
  const current = !!state.todayLog.supplementsTaken[suppId];
  state.todayLog.supplementsTaken[suppId] = !current;
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

// المحلل الذكي للوجبات بالعامية المصرية (محدث لحالة استئصال المرارة + الشغل المكتبي)
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
  "gallbladderNote": "تقييم مدى ملاءمة دهون هذه الوجبة لمن أزال المرارة وكيف يعدلها لتجنب المغص أو الإسهال الصفراوي",
  "replyText": "رد مصري ودود وعملي جداً يوضح: 1) هل الدهون في الوجبة آمنة للي شايل المرارة؟ 2) هل الألياف كافية؟ 3) نصيحة عملية فورية (مثل أخذ إنزيمات هاضمة، إضافة ألياف ذائبة كالشوفان/التفاح/السلطة، أو تقليل التومية/الزيت)."
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
  const normalized = text.trim();
  const matchedFoods = [];

  const keywordMap = [
    { keys: ['فول'], foodId: 'foul_baladi_sandwich' },
    { keys: ['طعمية', 'طعميه', 'فلافل'], foodId: 'taamia_sandwich' },
    { keys: ['بيض', 'مسلوق'], foodId: 'foul_plate_eggs' },
    { keys: ['بطاطس'], foodId: 'batates_syami_sandwich' },
    { keys: ['جبنة قريش', 'جبنه قريش', 'قريش'], foodId: 'areesh_cheese_plate' },
    { keys: ['كشري', 'كشرى'], foodId: 'koshary_medium_bowl' },
    { keys: ['طاجن', 'مكرونة', 'مكرونه'], foodId: 'tagine_pasta_chicken' },
    { keys: ['فرخة', 'فرخه', 'فراخ مشوية', 'فراخ مشويه', 'نص فرخة'], foodId: 'grilled_half_chicken' },
    { keys: ['شاورما فراخ', 'شاورما سوري', 'شاورما'], foodId: 'shawarma_chicken_syrian' },
    { keys: ['شاورما لحم', 'ابو حيدر', 'أبو حيدر'], foodId: 'shawarma_meat_kaiser' },
    { keys: ['كفتة', 'كفته'], foodId: 'kofta_mashwia_quarter' },
    { keys: ['شيش طاووق', 'شيش'], foodId: 'shish_tawook_meal' },
    { keys: ['كبدة', 'كبده'], foodId: 'kebda_iskandarani_baladi' },
    { keys: ['سجق'], foodId: 'sogo2_sharqi_sandwich' },
    { keys: ['حواوشي', 'حواوشى'], foodId: 'hawawshi_baladi_loaf' },
    { keys: ['سمك', 'بلطي', 'بوري'], foodId: 'grilled_bouri_or_bolti_fish' },
    { keys: ['ملوخية', 'ملوخيه'], foodId: 'molokhia_with_chicken_rice' },
    { keys: ['محشي', 'محشى', 'ورق عنب', 'كرنب'], foodId: 'mahshi_mixed_plate' },
    { keys: ['تونة', 'تونه'], foodId: 'tuna_salad_bowl' },
    { keys: ['سلطة', 'سلطه'], foodId: 'salata_baladi_large' },
    { keys: ['جرجير', 'خيار', 'جزر'], foodId: 'gargeer_cucumber_bundle' },
    { keys: ['ترمس', 'حمص'], foodId: 'termis_hommos_cup' },
    { keys: ['تفاح', 'جوافة', 'جوافه', 'برتقال', 'فاكهة'], foodId: 'guava_apple_orange' },
    { keys: ['زبادي', 'شوفان', 'شيا'], foodId: 'oats_chia_yogurt' },
    { keys: ['قهوة', 'قهوه', 'نسكافيه', 'إسبريسو'], foodId: 'turkish_coffee_plain' },
    { keys: ['مكسرات', 'لوز', 'عين جمل', 'سوداني'], foodId: 'raw_nuts_handful' },
    { keys: ['قصب', 'عصير'], foodId: 'asab_sugarcane_juice' }
  ];

  let quantityMultiplier = 1;
  if (normalized.includes('ساندوتشين') || normalized.includes('رغيفين') || normalized.includes('2 ') || normalized.includes('اتنين')) {
    quantityMultiplier = 2;
  } else if (normalized.includes('3 ') || normalized.includes('تلاتة') || normalized.includes('ثلاثة')) {
    quantityMultiplier = 3;
  } else if (normalized.includes('نص ') && !normalized.includes('نص فرخة')) {
    quantityMultiplier = 0.6;
  }

  for (const entry of keywordMap) {
    if (entry.keys.some((k) => normalized.includes(k))) {
      const f = state.foodsDb.find((item) => item.id === entry.foodId);
      if (f && !matchedFoods.some((m) => m.id === f.id)) {
        matchedFoods.push(f);
      }
    }
  }

  if (matchedFoods.length === 0) {
    const estMeal = {
      id: 'custom_ai_' + Date.now(),
      name: normalized.length > 42 ? normalized.slice(0, 42) + '...' : normalized,
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
      replyText: `حسبتلك تقدير غذائي لـ **"${estMeal.name}"**: حوالي **${estMeal.calories} سعرة**، **${estMeal.protein} جم بروتين**، **${estMeal.fats} جم دهون**، و **${estMeal.fiber} جم ألياف**.\n🩺 **تقييم المرارة:** طالما الدهون في حدود ${state.profile.maxFatPerMeal} جم في الوجبة الواحدة فهي مريحة للهضم، ويفضل أكل خيار وجرجير أو تفاحة معها لربط الأحماض الصفراوية.`,
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
      acc.sodium += Math.round(f.sodium * quantityMultiplier);
      acc.iron += Math.round(f.iron * quantityMultiplier * 10) / 10;
      acc.calcium += Math.round(f.calcium * quantityMultiplier);
      acc.potassium += Math.round(f.potassium * quantityMultiplier);
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
      ? `🔴 **تحذير هام لأنك شايل المرارة:** إجمالي الدهون في هذه الوجبة **${combined.fats} جم** (أعلى من الحد الآمن ${maxSafeFat} جم للوجبة الواحدة!). ده ممكن يسبب عسر هضم أو إسهال صفراوي. اقسم الوجبة على مرتين، أو خد كبسولة إنزيمات هاضمة وألياف ذائبة. (${combined.gbNotes[0] || ''})`
      : `🟢 **آمن لـما بعد استئصال المرارة:** الدهون في هذه الوجبة **${combined.fats} جم** فقط (ضمن الحد الآمن ${maxSafeFat} جم/وجبة). ${combined.gbNotes[0] || ''}`
    : '';

  const parsedMeal = {
    id: 'smart_parsed_' + Date.now(),
    name: mealTitle,
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
    mealTiming: 'وجبة محللة بالخبير الذكي',
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
  state.todayLog.meals.unshift(entry);
  saveState();
  showToast('تمت إضافة الوجبة المحللة لسجل يومك (ويمكنك تعديل أي رقم بها)! 🎉');
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

// حساب تلقائي للأهداف بناءً على الجسم وحالة استئصال المرارة
window.recalculateAutoTargets = function () {
  const weight = Number(document.getElementById('prof-weight')?.value) || state.profile.weight;
  const height = Number(document.getElementById('prof-height')?.value) || state.profile.height;
  const age = Number(document.getElementById('prof-age')?.value) || state.profile.age;
  const goal = document.getElementById('prof-goal')?.value || state.profile.goal;
  const gbRemoved = document.getElementById('prof-gb-removed')?.checked ?? state.profile.gallbladderRemoved;

  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = Math.round(bmr * 1.28);

  let targetCal = tdee;
  if (goal === 'fat_loss') targetCal = Math.max(1400, tdee - 420);
  if (goal === 'muscle') targetCal = tdee + 250;

  const protein = Math.round(weight * 1.65);
  // لو شايل المرارة نخلي نسبة الدهون اليومية 22% فقط بدل 28% ونوزعها على 4 وجبات
  const fatPct = gbRemoved ? 0.22 : 0.27;
  const fats = Math.round((targetCal * fatPct) / 9);
  const carbs = Math.max(90, Math.round((targetCal - protein * 4 - fats * 9) / 4));
  const fiber = gbRemoved ? 32 : 30;
  const maxFatPerMeal = gbRemoved ? Math.min(15, Math.round(fats / 3.8)) : 25;

  document.getElementById('prof-cal-target').value = targetCal;
  document.getElementById('prof-prot-target').value = protein;
  document.getElementById('prof-carbs-target').value = carbs;
  document.getElementById('prof-fats-target').value = fats;
  document.getElementById('prof-fiber-target').value = fiber;
  document.getElementById('prof-max-meal-fat').value = maxFatPerMeal;

  showToast('تم حساب الأرقام تلقائياً! اضغط "حفظ كافة البيانات" لتأكيدها 🧮');
};

// حفظ كافة إعدادات الحساب والحالة الصحية والأهداف القابلة للتعديل
window.saveProfileSettings = function (event) {
  event.preventDefault();
  const name = document.getElementById('prof-name')?.value?.trim() || 'بطل الشغل المكتبي';
  const weight = Number(document.getElementById('prof-weight')?.value) || 80;
  const height = Number(document.getElementById('prof-height')?.value) || 175;
  const age = Number(document.getElementById('prof-age')?.value) || 30;
  const workStyle = document.getElementById('prof-workstyle')?.value?.trim() || 'شغل مكتبي / ريموت';
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
    weight,
    height,
    age,
    workStyle,
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
  showToast('تم حفظ ملفك الصحي وأهدافك القابلة للتعديل بنجاح! ✅');
  renderApp();
};

// تصدير واستيراد البيانات وإعادة الضبط
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

// نظام التذكيرات وإشعارات الآيفون
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
    new Notification('خبير التغذية المصري 🥗', {
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
    } catch (e) {
      console.log('Notification fallback to in-app toast');
    }
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

// ===== واجهة Dashboard (الرئيسية) =====
function renderDashboardView() {
  const totals = getTodayTotals();
  const targets = state.profile.targets;
  const p = state.profile;
  const calPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  const fiberPct = Math.min(100, Math.round((totals.fiber / targets.fiber) * 100));
  const proteinPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
  const carbsPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
  const fatsPct = Math.min(100, Math.round((totals.fats / targets.fats) * 100));

  const alerts = getSmartOfficeDiagnosis(totals);

  return `
    <div class="space-y-4 pb-6">
      <!-- بطاقة الترحيب والحالة الصحية القابلة للتعديل -->
      <div class="glass-card-highlight p-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                💻 ${p.workStyle}
              </span>
              ${
                p.gallbladderRemoved
                  ? `<span class="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-sky-400/40">
                      🩺 شايل المرارة (حد الدهون: ${p.maxFatPerMeal}جم/وجبة)
                    </span>`
                  : ''
              }
            </div>
            <h2 class="text-base font-extrabold text-white mt-1.5">أهلاً يا ${p.name} 👋</h2>
            <p class="text-[11px] text-slate-300 mt-0.5">${p.medicalNotes || 'نظامك الصحي قابل للتعديل بالكامل'}</p>
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
            المتبقي اليوم: <strong class="text-emerald-300">${Math.max(0, targets.calories - totals.calories)} سعرة</strong>
          </p>
        </div>

        <div class="glass-card p-4 relative overflow-hidden border ${
          totals.fiber < 15 ? 'border-amber-500/30' : 'border-emerald-500/40'
        }">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-xs text-emerald-300 font-bold">عداد الألياف (للمرارة!)</span>
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
            <button onclick="switchTab('foods', 'fiber_boosters')" class="text-[11px] text-emerald-400 font-bold underline">
              + زود ألياف
            </button>
          </div>
        </div>
      </div>

      <!-- الماكروز + مؤشر دهون المرارة -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-slate-300">⚖️ العناصر الغذائية الكبرى ومؤشر دهون المرارة</h3>
          <button onclick="switchTab('profile')" class="text-[11px] text-emerald-400 underline">✏️ تعديل الأهداف</button>
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
                  }">أقصى وجبة: ${totals.maxSingleMealFat} / ${p.maxFatPerMeal}جم</div>`
                : ''
            }
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
          <div>
            <div class="text-[10px] text-slate-400">حديد (تركيز)</div>
            <div class="text-xs font-bold text-emerald-300">${totals.iron.toFixed(1)} / ${targets.iron} ملجم</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">كالسيوم</div>
            <div class="text-xs font-bold text-sky-300">${totals.calcium} / ${targets.calcium}</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">بوتاسيوم</div>
            <div class="text-xs font-bold text-teal-300">${totals.potassium} ملجم</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">صوديوم (ملح)</div>
            <div class="text-xs font-bold ${totals.sodium > targets.sodiumMax ? 'text-rose-400' : 'text-amber-300'}">${totals.sodium} / ${targets.sodiumMax}</div>
          </div>
        </div>
      </div>

      <!-- تشخيص الخبير الفوري لليوم -->
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

      <!-- عادات المكتب اليومية -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-card p-3.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sky-300">💧 شرب المية</span>
            <span class="text-xs font-extrabold text-white">${state.todayLog.waterCups} / ${targets.waterCups} أكواب</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">يخفف العصارة الصفراوية ويمنع الصداع</p>
          <div class="flex items-center gap-2 mt-2.5">
            <button onclick="updateHabit('waterCups', 1)" class="ios-btn flex-1 bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 font-bold text-xs py-2 rounded-xl">
              + شربت كوباية
            </button>
            <button onclick="updateHabit('waterCups', -1)" class="ios-btn bg-slate-800 text-slate-400 font-bold text-xs px-3 py-2 rounded-xl">
              -
            </button>
          </div>
        </div>

        <div class="glass-card p-3.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-amber-300">🚶‍♂️ قومة المكتب والهضم</span>
            <span class="text-xs font-extrabold text-white">${state.todayLog.stretchBreaks} / ${targets.stretchBreaks} مرات</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">يمنع الغازات والارتجاع مع الجلوس</p>
          <div class="flex items-center gap-2 mt-2.5">
            <button onclick="updateHabit('stretchBreaks', 1)" class="ios-btn flex-1 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 font-bold text-xs py-2 rounded-xl">
              + قمت اتحركت
            </button>
            <button onclick="updateHabit('stretchBreaks', -1)" class="ios-btn bg-slate-800 text-slate-400 font-bold text-xs px-3 py-2 rounded-xl">
              -
            </button>
          </div>
        </div>
      </div>

      <!-- سجل الوجبات اليومي (مع إمكانية تعديل أي وجبة مسجلة!) -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>📋</span>
            <span>سجل وجبات اليوم (${state.todayLog.meals.length})</span>
          </h3>
          <button onclick="switchTab('foods')" class="ios-btn bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-xl">
            + سجل أكلة
          </button>
        </div>

        ${
          state.todayLog.meals.length === 0
            ? `
          <div class="text-center py-6 bg-slate-900/40 rounded-2xl border border-dashed border-slate-700">
            <div class="text-3xl mb-2">🥙🩺🍗</div>
            <p class="text-xs text-slate-300 font-semibold">لسه ما سجلتش أكل النهاردة!</p>
            <p class="text-[11px] text-slate-400 mt-1">اختار من الأكلات المريحة بدون مرارة أو اكتب وجبتك للخبير الذكي</p>
            <div class="flex justify-center gap-2 mt-3">
              <button onclick="switchTab('foods', 'gallbladder_safe')" class="ios-btn bg-emerald-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl">
                💚 أكلات مريحة بدون مرارة
              </button>
              <button onclick="switchTab('ai')" class="ios-btn bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/10">
                🤖 اكتب وجبتك بالعامية
              </button>
            </div>
          </div>
        `
            : `
          <div class="space-y-2.5">
            ${state.todayLog.meals
              .map((m) => {
                const mealFat = (m.fats * m.multiplier).toFixed(1);
                const isHeavyFat = p.gallbladderRemoved && Number(mealFat) > p.maxFatPerMeal;
                return `
              <div class="bg-slate-900/70 p-3 rounded-2xl border ${
                isHeavyFat ? 'border-rose-500/50' : 'border-white/5'
              } flex items-start justify-between gap-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">${m.timeAdded}</span>
                    <span class="text-xs font-extrabold text-white">${m.name}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    🔥 ${Math.round(m.calories * m.multiplier)} سعرة • 🍗 ${Math.round(m.protein * m.multiplier)}جم بروتين • 🌾 <strong class="text-emerald-300">${(m.fiber * m.multiplier).toFixed(1)}جم ألياف</strong> • 🩺 <strong class="${isHeavyFat ? 'text-rose-400' : 'text-purple-300'}">${mealFat}جم دهون</strong>
                  </div>
                  ${
                    p.gallbladderRemoved && m.gallbladderNote
                      ? `<p class="text-[11px] text-sky-300 mt-1.5 bg-sky-950/30 p-2 rounded-lg border border-sky-500/20">🩺 <strong>للمرارة:</strong> ${m.gallbladderNote}</p>`
                      : ''
                  }
                </div>
                <div class="flex flex-col gap-1">
                  <button onclick="openEditLoggedMealModal('${m.logId}')" class="bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] px-2.5 py-1 rounded-lg font-bold">
                    ✏️ تعديل
                  </button>
                  <button onclick="removeMealFromLog('${m.logId}')" class="bg-slate-800/60 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[11px] px-2.5 py-1 rounded-lg">
                    حذف ✕
                  </button>
                </div>
              </div>
            `;
              })
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;
}

// ===== واجهة دليل أكل الشارع والمطاعم المصرية (قابلة للتعديل والإضافة) =====
function getFilteredFoods() {
  const q = state.searchQuery.trim().toLowerCase();
  return state.foodsDb.filter((food) => {
    const matchCat =
      state.selectedCategory === 'all' ||
      (state.selectedCategory === 'gallbladder_safe' && food.gallbladderStatus === 'safe') ||
      food.category === state.selectedCategory;
    const matchQuery =
      !q ||
      food.name.toLowerCase().includes(q) ||
      (food.restaurantHint || '').toLowerCase().includes(q) ||
      (food.expertTip || '').toLowerCase().includes(q) ||
      (food.gallbladderNote || '').toLowerCase().includes(q);
    return matchCat && matchQuery;
  });
}

function renderFoodCardsList(foods) {
  if (foods.length === 0) {
    return `
      <div class="glass-card p-6 text-center space-y-3">
        <div class="text-3xl">🔍</div>
        <p class="text-sm font-bold text-white">ملقيتش الأكلة دي في المنيو؟</p>
        <p class="text-xs text-slate-400">تقدر تضيفها بنفسك للمنيو فوراً أو تكتبها للخبير الذكي!</p>
        <div class="flex justify-center gap-2">
          <button onclick="openEditFoodDbModal(null)" class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl">
            ➕ أضف أكلة جديدة للمنيو
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
              📍 ${food.restaurantHint}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${gbBadge.cls}">
              ${gbBadge.label}
            </span>
          </div>
          <h4 class="text-sm font-extrabold text-white mt-1.5">${food.name}</h4>
          <p class="text-[11px] text-slate-400">الحصة: ${food.serving}</p>
        </div>
        <button
          onclick="openEditFoodDbModal('${food.id}')"
          class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10"
        >
          ✏️ تعديل
        </button>
      </div>

      <!-- الأرقام الغذائية -->
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
              <strong class="text-sky-300">🩺 نصيحة ما بعد استئصال المرارة:</strong> ${food.gallbladderNote}
            </div>`
          : ''
      }

      <div class="bg-slate-900/50 p-2.5 rounded-xl border border-emerald-500/20 text-xs text-slate-200 leading-relaxed">
        <strong class="text-emerald-400">💡 نصيحة الشغل:</strong> ${food.expertTip}
      </div>

      <!-- أزرار الإضافة السريعة -->
      <div class="flex items-center gap-2 pt-1">
        <button onclick="addMealToLog('${food.id}', 1)" class="ios-btn flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl shadow">
          + سجل حصة كاملة
        </button>
        <button onclick="addMealToLog('${food.id}', 0.5)" class="ios-btn bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-white/10">
          + نصف حصة (${(food.fats * 0.5).toFixed(1)}جم دهون)
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
            <h2 class="text-base font-extrabold text-white">🥙 موسوعة الأكل المصري (قابلة للتعديل)</h2>
            <p class="text-[11px] text-slate-300 mt-0.5">مزودة بتقييم الدهون لما بعد استئصال المرارة + إمكانية تعديل وإضافة أي أكلة</p>
          </div>
          <button
            onclick="openEditFoodDbModal(null)"
            class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl whitespace-nowrap shadow"
          >
            ➕ أضف أكلة
          </button>
        </div>
        
        <div class="mt-3 relative">
          <input
            type="text"
            value="${state.searchQuery}"
            oninput="handleSearchInput(this.value)"
            placeholder="ابحث عن أكلة أو مطعم (مثلاً: كشري، جاد، شاورما، ملوخية، شوفان)..."
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

// ===== واجهة الخبير الذكي (AI Nutritionist) =====
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
          placeholder="مثال: معروض عليا آكل حواوشي أو نص فرخة مشوية في الشغل، أختار إيه وأنا شايل المرارة؟"
          class="w-full bg-slate-900/90 text-white text-xs rounded-xl p-3 border border-white/15 focus:outline-none focus:border-emerald-400"
        ></textarea>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="document.getElementById('ai-meal-input').value='فطرت فول بالبيض المسلوق وعيش بلدي وجرجير'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🥙 فول بالبيض المسلوق
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='طلبت نص فرخة مشوية مع سلطة خضراء و5 معالق رز'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🍗 نص فرخة مشوية
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='كلت رغيف حواوشي بلدي وسندوتش سجق'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
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

// ===== واجهة المكملات الغذائية والمنبهات (كلها قابلة للتعديل والإضافة والحذف) =====
function renderSupplementsAndRemindersView() {
  const allSupps = state.supplementsList;
  const takenCount = allSupps.filter((s) => state.todayLog.supplementsTaken[s.id]).length;

  return `
    <div class="space-y-4 pb-6">
      <div class="glass-card-highlight p-4 flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-white">💊 مكملات المرارة والشغل (قابلة للتعديل)</h2>
          <p class="text-xs text-slate-300 mt-0.5">
            أخدت <strong class="text-emerald-300">${takenCount} من ${allSupps.length}</strong> مكملات النهاردة
          </p>
        </div>
        <button
          onclick="openEditSupplementModal(null)"
          class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow"
        >
          ➕ إضافة مكمل
        </button>
      </div>

      <!-- قائمة المكملات اليومية مع زر تعديل لكل مكمل -->
      <div class="space-y-2.5">
        ${allSupps
          .map((supp) => {
            const isTaken = !!state.todayLog.supplementsTaken[supp.id];
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

      <!-- قسم المنبهات والتذكيرات القابلة للتعديل -->
      <div class="glass-card p-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-white">🔔 منبهات المتابعة (قابلة للتعديل)</h3>
            <p class="text-[11px] text-slate-400">يمكنك تعديل وقت أو نص أي منبه أو إضافة منبه جديد</p>
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

// ===== واجهة الملف الشخصي والحالة الصحية (شايل المرارة + أهداف قابلة للتعديل الكامل) =====
function renderProfileView() {
  const p = state.profile;
  const t = p.targets;
  return `
    <div class="space-y-4 pb-6">
      <form onsubmit="saveProfileSettings(event)" class="glass-card p-4 space-y-3.5">
        <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <h2 class="text-base font-extrabold text-white">🩺 الملف الصحي والبيانات القابلة للتعديل</h2>
            <p class="text-[11px] text-emerald-300">يمكنك تعديل حالتك الصحية، استئصال المرارة، وجميع الأرقام بحرية</p>
          </div>
        </div>

        <!-- البيانات الأساسية -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الاسم أو اللقب</label>
            <input id="prof-name" type="text" value="${p.name}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">طبيعة الشغل</label>
            <input id="prof-workstyle" type="text" value="${p.workStyle}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الوزن (كجم)</label>
            <input id="prof-weight" type="number" step="0.5" value="${p.weight}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الطول (سم)</label>
            <input id="prof-height" type="number" value="${p.height}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
          </div>
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">السن</label>
            <input id="prof-age" type="number" value="${p.age}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
          </div>
        </div>

        <!-- قسم الحالة الطبية (استئصال المرارة والقولون) -->
        <div class="bg-sky-950/30 p-3.5 rounded-2xl border border-sky-500/30 space-y-2.5">
          <h3 class="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
            <span>🩺</span>
            <span>الحالة الصحية والهضمية (قابلة للتعديل)</span>
          </h3>

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
            <span class="text-[10px] text-slate-400 block mt-1">للي شايل المرارة يُنصح بـ 12 إلى 15 جم دهون كحد أقصى في الوجبة الواحدة.</span>
          </div>

          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">ملاحظاتك الصحية الخاصة (تظهر للخبير الذكي)</label>
            <textarea id="prof-med-notes" rows="2" class="w-full bg-slate-900 text-white text-xs rounded-xl p-2.5 border border-white/15">${p.medicalNotes || ''}</textarea>
          </div>
        </div>

        <!-- الأهداف اليومية القابلة للتعديل المباشر أو الحساب التلقائي -->
        <div class="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold text-emerald-300">🎯 الأهداف اليومية (قابلة للتعديل اليدوي أو التلقائي)</h3>
            <button
              type="button"
              onclick="recalculateAutoTargets()"
              class="ios-btn bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg"
            >
              🧮 احسب تلقائياً لجسمي
            </button>
          </div>

          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الهدف العام</label>
            <select id="prof-goal" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15">
              <option value="fat_loss" ${p.goal === 'fat_loss' ? 'selected' : ''}>تنشيف وخسارة الكرش المكتبي</option>
              <option value="maintain" ${p.goal === 'maintain' ? 'selected' : ''}>ثبات الوزن وراحة الهضم والنشاط</option>
              <option value="muscle" ${p.goal === 'muscle' ? 'selected' : ''}>زيادة عضل صافي</option>
            </select>
          </div>

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
              <label class="text-[11px] text-sky-300 font-bold block mb-1">هدف أكواب الماء 💧</label>
              <input id="prof-water-target" type="number" value="${t.waterCups}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
            <div>
              <label class="text-[11px] text-amber-300 font-bold block mb-1">هدف قومة المكتب 🚶‍♂️</label>
              <input id="prof-stretch-target" type="number" value="${t.stretchBreaks}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15" />
            </div>
          </div>
        </div>

        <button type="submit" class="ios-btn w-full bg-emerald-500 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg">
          💾 حفظ كافة البيانات والتعديلات
        </button>
      </form>

      <!-- نسخ احتياطي واستعادة البيانات -->
      <div class="glass-card p-4 space-y-2.5">
        <h3 class="text-xs font-extrabold text-white">📂 نسخ احتياطي واستعادة التعديلات</h3>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="exportUserData()" class="ios-btn bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold py-2.5 rounded-xl border border-emerald-500/30">
            📥 تصدير بياناتي (JSON)
          </button>
          <label class="ios-btn bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold py-2.5 rounded-xl border border-sky-500/30 text-center cursor-pointer">
            📤 استيراد بياناتي
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
