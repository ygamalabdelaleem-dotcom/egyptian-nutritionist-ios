// المنطق الرئيسي لتطبيق خبير التغذية المصري - رفيق الشغل المكتبي (iOS PWA)

const STORAGE_KEY = 'egy_nutritionist_state_v1';

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
    targets: {
      calories: 1950,
      protein: 130,
      carbs: 190,
      fats: 65,
      fiber: 30,
      sodiumMax: 2300,
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
    supplementsTaken: {} // { suppId: true/false }
  },
  customSupplements: [],
  reminders: window.DEFAULT_REMINDERS || [],
  geminiApiKey: '',
  aiHistory: [
    {
      role: 'assistant',
      text: 'أهلاً بك يا بطل! 👨‍💻🥗 أنا خبيرك الغذائي المصري المخصص لطبيعة شغلك المكتبي. عارف إن يومك معظمه قدام الشاشة وأكلك غالباً دليفري أو من مطاعم الشارع المصري. سجل أكلك أو اكتبلي أكلت إيه بالعامية، وهظبطلك السعرات، الألياف، والمكملات عشان تحافظ على صحتك وتركيزك من غير خمول ولا زيادة وزن!',
      parsedMeal: null
    }
  ]
};

let state = loadState();
let reminderTimers = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    const today = getTodayDateString();
    // إذا بدأ يوم جديد نصفر سجل اليوم فقط مع الحفاظ على الإعدادات
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
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      profile: {
        ...structuredClone(DEFAULT_STATE.profile),
        ...(parsed.profile || {}),
        targets: {
          ...structuredClone(DEFAULT_STATE.profile.targets),
          ...(parsed.profile?.targets || {})
        }
      }
    };
  } catch (e) {
    console.error('Error loading state:', e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// حساب إجماليات اليوم
function getTodayTotals() {
  return state.todayLog.meals.reduce(
    (acc, item) => {
      const m = Number(item.multiplier || 1);
      acc.calories += Math.round((item.calories || 0) * m);
      acc.protein += Math.round((item.protein || 0) * m * 10) / 10;
      acc.carbs += Math.round((item.carbs || 0) * m * 10) / 10;
      acc.fats += Math.round((item.fats || 0) * m * 10) / 10;
      acc.fiber += Math.round((item.fiber || 0) * m * 10) / 10;
      acc.sodium += Math.round((item.sodium || 0) * m);
      acc.iron += Math.round((item.iron || 0) * m * 10) / 10;
      acc.calcium += Math.round((item.calcium || 0) * m);
      acc.potassium += Math.round((item.potassium || 0) * m);
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
      potassium: 0
    }
  );
}

// توليد تشخيص الخبير الذكي بناءً على حالة اليوم وطبيعة الشغل المكتبي
function getSmartOfficeDiagnosis(totals) {
  const t = state.profile.targets;
  const alerts = [];

  // 1. فحص الألياف مقارنة بالسعرات (مهم جداً لأكل المطاعم والشغل المكتبي)
  const calRatio = totals.calories / Math.max(t.calories, 1);
  const fiberRatio = totals.fiber / Math.max(t.fiber, 1);

  if (totals.calories > 450 && fiberRatio < calRatio * 0.65) {
    alerts.push({
      type: 'warning',
      icon: '🥗',
      title: 'تنبيه نقص الألياف مع أكل المطاعم!',
      message: `أخدت ${totals.calories} سعرة بس الألياف عندك ${totals.fiber.toFixed(1)} جم فقط (الهدف ${t.fiber} جم). ده بيخلي الأكل يتهضم بسرعة ويرفع الإنسولين ويعملك خمول وإنت قاعد على المكتب!`,
      actionLabel: 'أضف رافع ألياف سريع الآن',
      actionTab: 'foods',
      actionCategory: 'fiber_boosters'
    });
  } else if (totals.fiber >= 20) {
    alerts.push({
      type: 'success',
      icon: '🌿',
      title: 'مستوى ألياف ممتاز النهاردة!',
      message: `وصلت لـ ${totals.fiber.toFixed(1)} جم ألياف! ده بيحافظ على شبعك وتركيزك ويحمي قولونك مع الجلوس الطويل.`
    });
  }

  // 2. فحص الصوديوم والموالح
  if (totals.sodium > t.sodiumMax * 0.8) {
    alerts.push({
      type: 'danger',
      icon: '🧂',
      title: 'الصوديوم والأملاح عالية النهاردة!',
      message: `وصلت لـ ${totals.sodium} ملجم صوديوم بسبب التتبيلات أو أكل الشارع. عشان تمنع الصداع واحتباس المية مع قعدة المكتب، اشرب كوبايتين مية فوراً وكل خيار أو جرجير (غني بالبوتاسيوم).`
    });
  }

  // 3. فحص وجبات الخمول المكتبي (Food Coma)
  const comaMeals = state.todayLog.meals.filter((m) => m.officeImpact === 'high-coma');
  if (comaMeals.length > 0) {
    alerts.push({
      type: 'info',
      icon: '⚡',
      title: 'خطة منع الخمول بعد الأكل الثقيل',
      message: `سجلت "${comaMeals[comaMeals.length - 1].name}". عشان ما تحسش بكبسة نوم قدام اللابتوب: قوم امشي 5 دقايق في المكان، اشرب كوباية مية بالليمون أو شاي أخضر بالنعناع، وأجّل القهوة 45 دقيقة.`
    });
  }

  // 4. فحص المكملات وشرب الماء
  const allSupps = [...window.DEFAULT_SUPPLEMENTS, ...state.customSupplements];
  const takenCount = allSupps.filter((s) => state.todayLog.supplementsTaken[s.id]).length;
  if (totals.calories > 300 && takenCount === 0) {
    alerts.push({
      type: 'info',
      icon: '💊',
      title: 'لا تنسَ مكملات الشغل المكتبي!',
      message: 'طالما أكلت، ده أنسب وقت تاخد فيتامين د3 وأوميجا 3 عشان يمتصوا كويس مع الأكل ويرفعوا تركيزك.',
      actionLabel: 'سجل مكملاتك الآن',
      actionTab: 'supplements'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      icon: '👨‍⚕️',
      title: 'خبيرك الغذائي يتابع معك خطوة بخطوة',
      message: 'ابدا بتسجيل فطارك أو غداك من قائمة أكل الشارع المصري والمطاعم، أو اكتب وجبتك بحرية للخبير الذكي عشان يحسبلك العناصر والألياف فوراً!'
    });
  }

  return alerts;
}

// إضافة أكلة لسجل اليوم
window.addMealToLog = function (foodId, multiplier = 1, mealTiming = 'غداء / شغل') {
  const food = window.EGYPTIAN_FOODS_DB.find((f) => f.id === foodId);
  if (!food) return;
  const entry = {
    ...food,
    logId: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    multiplier: Number(multiplier),
    mealTiming,
    timeAdded: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  };
  state.todayLog.meals.unshift(entry);
  saveState();
  showToast(`تم تسجيل "${food.name}" بنجاح ✅`);
  renderApp();
};

// حذف أكلة من سجل اليوم
window.removeMealFromLog = function (logId) {
  state.todayLog.meals = state.todayLog.meals.filter((m) => m.logId !== logId);
  saveState();
  showToast('تم حذف الوجبة من سجل اليوم');
  renderApp();
};

// تحديث الماء والحركة
window.updateHabit = function (key, delta) {
  const next = Math.max(0, (state.todayLog[key] || 0) + delta);
  state.todayLog[key] = next;
  saveState();
  if (delta > 0 && key === 'waterCups') {
    showToast('عاش يا بطل! كوباية مية بترفع التركيز وتقلل الجوع 💧');
  } else if (delta > 0 && key === 'stretchBreaks') {
    showToast('ممتاز! دقيقتين حركة بتنشط الدورة الدموية والحرق 🚶‍♂️');
  }
  renderApp();
};

// تبديل حالة المكمل الغذائي
window.toggleSupplement = function (suppId) {
  const current = !!state.todayLog.supplementsTaken[suppId];
  state.todayLog.supplementsTaken[suppId] = !current;
  saveState();
  if (!current) {
    showToast('برافو! تم تسجيل أخذ المكمل الغذائي 💊');
  }
  renderApp();
};

// إضافة مكمل غذائي مخصص
window.addCustomSupplement = function (event) {
  event.preventDefault();
  const name = document.getElementById('custom-supp-name')?.value?.trim();
  const dosage = document.getElementById('custom-supp-dosage')?.value?.trim() || 'جرعة يومية';
  const timing = document.getElementById('custom-supp-timing')?.value?.trim() || 'بعد الأكل';
  if (!name) return;

  state.customSupplements.push({
    id: 'custom_supp_' + Date.now(),
    name,
    dosage,
    timing,
    reason: 'مكمل مخصص مضاف لخطتك اليومية.',
    warning: 'التزم بالجرعة المحددة مع شرب الماء.',
    icon: '💊'
  });
  saveState();
  showToast(`تمت إضافة "${name}" لقائمة مكملاتك!`);
  renderApp();
};

window.deleteCustomSupplement = function (suppId) {
  state.customSupplements = state.customSupplements.filter((s) => s.id !== suppId);
  delete state.todayLog.supplementsTaken[suppId];
  saveState();
  renderApp();
};

// التنقل بين التبويبات
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

// المحلل الذكي للوجبات بالعامية المصرية (يعمل بـ Gemini API أو بالمحرك المصري المحلي الذكي)
async function analyzeEgyptianMealText(userText) {
  const apiKey = state.geminiApiKey?.trim();

  if (apiKey) {
    try {
      const prompt = `أنت خبير تغذية مصري متخصص في تغذية الموظفين أصحاب العمل المكتبي (جلوس طويل واعتماد على أكل الشارع المصري والمطاعم والدليفري).
المستخدم كتب هذه الوجبة أو السؤال باللهجة المصرية:
"${userText}"

قم بتحليل الوجبة بدقة وأعد النتيجة بصيغة JSON فقط بدون أي نص خارج JSON كالتالي:
{
  "mealName": "اسم واضح للوجبة التي أكلها",
  "serving": "تقدير الكمية",
  "calories": 500,
  "protein": 25,
  "carbs": 55,
  "fats": 18,
  "fiber": 6.5,
  "sodium": 750,
  "iron": 3.2,
  "calcium": 80,
  "potassium": 450,
  "officeImpact": "energizing أو moderate أو high-coma",
  "replyText": "رد مصري ودود وعملي جداً يوضح تقييم الوجبة لطبيعة الشغل المكتبي، هل الألياف كافية؟ وإيه الإضافة البسيطة (مثل جرجير، سلطة، خيار، تقليل عيش/تومية، شرب مية) اللي تخلي الوجبة أفضل وتمنع الخمول والكرش المكتبي."
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
              expertTip: parsed.replyText
            }
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API fallback to local smart parser:', err);
    }
  }

  // المحرك المحلي الذكي للعامية المصرية (يعمل فوراً بدون إنترنت أو مفتاح API)
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

  // اكتشاف الأعداد بالعامية المصرية (مثلاً 2 ساندوتش أو رغيفين أو نص)
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
      const f = window.EGYPTIAN_FOODS_DB.find((item) => item.id === entry.foodId);
      if (f && !matchedFoods.some((m) => m.id === f.id)) {
        matchedFoods.push(f);
      }
    }
  }

  if (matchedFoods.length === 0) {
    // تقدير ذكي عام لأي وجبة مصرية غير موجودة حرفياً
    const estMeal = {
      id: 'custom_ai_' + Date.now(),
      name: normalized.length > 42 ? normalized.slice(0, 42) + '...' : normalized,
      restaurantHint: 'تقدير الخبير الغذائي المصري',
      serving: 'وجبة متوسطة',
      calories: 450,
      protein: 18,
      carbs: 52,
      fats: 16,
      fiber: 4.5,
      sodium: 680,
      iron: 2.5,
      calcium: 65,
      potassium: 410,
      officeImpact: 'moderate',
      expertTip: 'عشان تضمن إن الوجبة دي ما تعملش خمول وقت الشغل، كل قبلها طبق سلطة خضراء أو خيار وجرجير لرفع الألياف، واشرب كوباية مية كبيرة.'
    };
    return {
      replyText: `حسبتلك تقدير غذائي لـ **"${estMeal.name}"**: حوالي **${estMeal.calories} سعرة**، **${estMeal.protein} جم بروتين**، و **${estMeal.fiber} جم ألياف**. 💡 نصيحتي ليك وإنت قاعد على المكتب: زود خضار ورقي (جرجير أو خيار) جنبها عشان ترفع الألياف وتمنع الخمول. تقدر تضغط على الزر تحت لإضافتها لسجل يومك فوراً!`,
      parsedMeal: estMeal
    };
  }

  // دمج الأكلات المكتشفة في وجبة واحدة محسوبة
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
      acc.tips.push(f.expertTip);
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
      tips: []
    }
  );

  const mealTitle = combined.names.join(' + ') + (quantityMultiplier !== 1 ? ` (×${quantityMultiplier})` : '');
  const fiberEvaluation =
    combined.fiber < 5
      ? '⚠️ ملاحظة مهمة: الألياف في الوجبة دي قليلة (' + combined.fiber + ' جم)، وده ممكن يجوعك بسرعة أو يعمل خمول قدام اللابتوب. ضيف خيارتين أو حزمة جرجير أو طبق سلطة بلدي!'
      : '✅ ممتاز! الوجبة فيها ' + combined.fiber + ' جم ألياف، وده هيساعدك تشبع وتحافظ على تركيزك في الشغل.';

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
    expertTip: combined.tips[0]
  };

  return {
    replyText: `يا بطل حللت وجبتك: **${mealTitle}** 🍽️\n• السعرات: **${combined.calories} سعرة** | البروتين: **${combined.protein} جم** | الألياف: **${combined.fiber} جم**\n• ${fiberEvaluation}\n• 💡 نصيحة الشغل المكتبي: ${combined.tips[0]}`,
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
    btn.innerHTML = 'جاري تحليل الوجبة... ⏳';
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
  showToast('تمت إضافة الوجبة المحللة لسجل يومك بنجاح! 🎉');
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

// حفظ إعدادات الجسم وإعادة حساب الاحتياج اليومي للشغل المكتبي
window.saveProfileSettings = function (event) {
  event.preventDefault();
  const name = document.getElementById('prof-name')?.value?.trim() || 'بطل الشغل المكتبي';
  const weight = Number(document.getElementById('prof-weight')?.value) || 80;
  const height = Number(document.getElementById('prof-height')?.value) || 175;
  const age = Number(document.getElementById('prof-age')?.value) || 30;
  const goal = document.getElementById('prof-goal')?.value || 'fat_loss';
  const fiberTarget = Number(document.getElementById('prof-fiber')?.value) || 30;

  // معادلة Mifflin-St Jeor مضبوطة على معامل نشاط الشغل المكتبي (1.28)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = Math.round(bmr * 1.28);

  let targetCal = tdee;
  if (goal === 'fat_loss') targetCal = Math.max(1400, tdee - 420);
  if (goal === 'muscle') targetCal = tdee + 250;

  const protein = Math.round(weight * 1.65);
  const fats = Math.round((targetCal * 0.27) / 9);
  const carbs = Math.max(90, Math.round((targetCal - protein * 4 - fats * 9) / 4));

  state.profile = {
    ...state.profile,
    name,
    weight,
    height,
    age,
    goal,
    targets: {
      ...state.profile.targets,
      calories: targetCal,
      protein,
      carbs,
      fats,
      fiber: fiberTarget
    }
  };
  saveState();
  showToast('تم تحديث خطتك الغذائية بناءً على جسمك وطبيعة شغلك المكتبي! ✅');
  renderApp();
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
      body: 'هفكرك بمواعيد المية، الحركة من المكتب، والألياف والمكملات في وقتها!',
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
  showToast(`${rem.icon} تذكير الخبير: ${rem.title}`);
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // ignore if audio not yet unlocked
  }
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

// Toast Notification UI
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className =
    'bg-emerald-600/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400/40 text-sm font-bold flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100';
  el.innerHTML = `<span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// واجهة Dashboard (الرئيسية)
function renderDashboardView() {
  const totals = getTodayTotals();
  const targets = state.profile.targets;
  const calPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  const fiberPct = Math.min(100, Math.round((totals.fiber / targets.fiber) * 100));
  const proteinPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
  const carbsPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
  const fatsPct = Math.min(100, Math.round((totals.fats / targets.fats) * 100));

  const alerts = getSmartOfficeDiagnosis(totals);

  return `
    <div class="space-y-4 pb-6">
      <!-- بطاقة الترحيب وطبيعة الشغل المكتبي -->
      <div class="glass-card-highlight p-4 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              💻 نظام الشغل المكتبي والريموت
            </span>
          </div>
          <h2 class="text-lg font-extrabold text-white mt-1">أهلاً يا ${state.profile.name} 👋</h2>
          <p class="text-xs text-slate-300">هدفك اليومي مضبوط لمنع الخمول وزيادة الحرق أثناء الجلوس</p>
        </div>
        <button onclick="switchTab('ai')" class="ios-btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5">
          <span>🤖</span>
          <span>اسأل الخبير</span>
        </button>
      </div>

      <!-- ملخص السعرات والألياف (أهم عنصرين للشغل المكتبي) -->
      <div class="grid grid-cols-2 gap-3">
        <!-- بطاقة السعرات -->
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

        <!-- بطاقة عداد الألياف الذكي -->
        <div class="glass-card p-4 relative overflow-hidden border ${
          totals.fiber < 15 ? 'border-amber-500/30' : 'border-emerald-500/40'
        }">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-xs text-emerald-300 font-bold">عداد الألياف (أساسي!)</span>
              <div class="text-2xl font-extrabold text-white mt-0.5">
                ${totals.fiber.toFixed(1)}<span class="text-xs font-normal text-slate-400"> جم / ${targets.fiber} جم</span>
              </div>
            </div>
            <span class="text-xl">🌾</span>
          </div>
          <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="progress-fill h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-500" style="width: ${fiberPct}%"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-[11px] text-slate-300">لمنع الكرش والخمول</span>
            <button onclick="switchTab('foods', 'fiber_boosters')" class="text-[11px] text-emerald-400 font-bold underline">
              + زود ألياف
            </button>
          </div>
        </div>
      </div>

      <!-- الماكروز (بروتين، كربوهيدرات، دهون) -->
      <div class="glass-card p-4">
        <h3 class="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
          <span>⚖️ توازن العناصر الغذائية الكبرى (Macros)</span>
          <span class="text-[11px] text-slate-400">مضبوطة للحفاظ على العضلات والتركيز</span>
        </h3>
        <div class="grid grid-cols-3 gap-3 text-center">
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
          <div class="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <div class="text-xs text-purple-300 font-bold">دهون 🥑</div>
            <div class="text-base font-extrabold text-white my-1">${totals.fats.toFixed(0)} <span class="text-[11px] text-slate-400">/ ${targets.fats}جم</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-purple-400 h-full rounded-full" style="width: ${fatsPct}%"></div>
            </div>
          </div>
        </div>

        <!-- المعادن الدقيقة المهمة مع أكل الشارع -->
        <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
          <div>
            <div class="text-[10px] text-slate-400">حديد (تركيز)</div>
            <div class="text-xs font-bold text-emerald-300">${totals.iron.toFixed(1)} / ${targets.iron} ملجم</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">كالسيوم (عظام)</div>
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

      <!-- عادات المكتب اليومية: شرب الماء + فواصل الحركة وفرد الظهر -->
      <div class="grid grid-cols-2 gap-3">
        <div class="glass-card p-3.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-sky-300">💧 شرب المية في المكتب</span>
            <span class="text-xs font-extrabold text-white">${state.todayLog.waterCups} / ${targets.waterCups} أكواب</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">يمنع صداع التكييف والجوع الكاذب</p>
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
            <span class="text-xs font-bold text-amber-300">🚶‍♂️ قومة المكتب وفرد الظهر</span>
            <span class="text-xs font-extrabold text-white">${state.todayLog.stretchBreaks} / ${targets.stretchBreaks} مرات</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">دقيقتين مشي كل ساعة بتشغل الحرق</p>
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

      <!-- سجل الوجبات التي أكلتها اليوم -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>📋</span>
            <span>الأكل اللي سجلته النهاردة (${state.todayLog.meals.length})</span>
          </h3>
          <button onclick="switchTab('foods')" class="ios-btn bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-xl">
            + سجل أكلة مصرية
          </button>
        </div>

        ${
          state.todayLog.meals.length === 0
            ? `
          <div class="text-center py-6 bg-slate-900/40 rounded-2xl border border-dashed border-slate-700">
            <div class="text-3xl mb-2">🥙🍲🍗</div>
            <p class="text-xs text-slate-300 font-semibold">لسه ما سجلتش أكل النهاردة!</p>
            <p class="text-[11px] text-slate-400 mt-1">اختار من منيو أكل الشارع والمطاعم المصرية أو اكتب للخبير الذكي</p>
            <div class="flex justify-center gap-2 mt-3">
              <button onclick="switchTab('foods')" class="ios-btn bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">
                منيو الأكل المصري
              </button>
              <button onclick="switchTab('ai')" class="ios-btn bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/10">
                اكتب وجبتك بالعامية
              </button>
            </div>
          </div>
        `
            : `
          <div class="space-y-2.5">
            ${state.todayLog.meals
              .map(
                (m) => `
              <div class="bg-slate-900/70 p-3 rounded-2xl border border-white/5 flex items-start justify-between gap-2">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">${m.timeAdded}</span>
                    <span class="text-xs font-extrabold text-white">${m.name}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    🔥 ${Math.round(m.calories * m.multiplier)} سعرة • 🍗 ${Math.round(m.protein * m.multiplier)}جم بروتين • 🌾 <strong class="text-emerald-300">${(m.fiber * m.multiplier).toFixed(1)}جم ألياف</strong>
                  </div>
                  ${
                    m.expertTip
                      ? `<p class="text-[11px] text-emerald-300/90 mt-1.5 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">💡 ${m.expertTip}</p>`
                      : ''
                  }
                </div>
                <button onclick="removeMealFromLog('${m.logId}')" class="text-slate-500 hover:text-rose-400 text-xs px-2 py-1">
                  ✕
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;
}

// واجهة دليل أكل الشارع والمطاعم المصرية
function getFilteredFoods() {
  const q = state.searchQuery.trim().toLowerCase();
  return window.EGYPTIAN_FOODS_DB.filter((food) => {
    const matchCat = state.selectedCategory === 'all' || food.category === state.selectedCategory;
    const matchQuery =
      !q ||
      food.name.toLowerCase().includes(q) ||
      food.restaurantHint.toLowerCase().includes(q) ||
      food.expertTip.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });
}

function renderFoodCardsList(foods) {
  if (foods.length === 0) {
    return `
      <div class="glass-card p-6 text-center">
        <div class="text-3xl mb-2">🔍</div>
        <p class="text-sm font-bold text-white">ملقيتش الأكلة دي في المنيو السريع؟</p>
        <p class="text-xs text-slate-400 mt-1">تقدر تكتب أي أكلة أو طلب دليفري بطريقتك للخبير الذكي وهيرد عليك فوراً بالسعرات والألياف!</p>
        <button onclick="switchTab('ai')" class="mt-3 ios-btn bg-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl">
          🤖 حلل أكلتك بالذكاء الاصطناعي
        </button>
      </div>
    `;
  }

  return foods
    .map(
      (food) => `
    <div class="glass-card p-4 space-y-2.5">
      <div class="flex justify-between items-start gap-2">
        <div>
          <span class="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
            📍 ${food.restaurantHint}
          </span>
          <h4 class="text-sm font-extrabold text-white mt-1.5">${food.name}</h4>
          <p class="text-[11px] text-slate-400">الحصة: ${food.serving}</p>
        </div>
        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full ${
          food.officeImpact === 'energizing'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : food.officeImpact === 'high-coma'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }">
          ${
            food.officeImpact === 'energizing'
              ? '⚡ ينشط التركيز'
              : food.officeImpact === 'high-coma'
              ? '😴 يسبب خمول لو كترت'
              : '⚖️ وجبة متوسطة'
          }
        </span>
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
          <div class="text-[10px] text-purple-300">دهون</div>
          <div class="text-xs font-extrabold text-purple-200">${food.fats}جم</div>
        </div>
      </div>

      <!-- نصيحة الخبير للشغل المكتبي -->
      <div class="bg-slate-900/50 p-2.5 rounded-xl border border-emerald-500/20 text-xs text-slate-200 leading-relaxed">
        <strong class="text-emerald-400">💡 نصيحة الخبير للشغل:</strong> ${food.expertTip}
      </div>

      <!-- أزرار الإضافة السريعة -->
      <div class="flex items-center gap-2 pt-1">
        <button onclick="addMealToLog('${food.id}', 1)" class="ios-btn flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl shadow">
          + سجل حصة كاملة
        </button>
        <button onclick="addMealToLog('${food.id}', 0.5)" class="ios-btn bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-white/10">
          + نصف حصة
        </button>
      </div>
    </div>
  `
    )
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
        <h2 class="text-base font-extrabold text-white">🥙 موسوعة أكل الشارع والمطاعم المصرية</h2>
        <p class="text-xs text-slate-300 mt-0.5">كشري، فول وطعمية، مشويات، شاورما، كبدة، أكل بيتي، ورافعات الألياف السريعة في المكتب</p>
        
        <!-- شريط البحث -->
        <div class="mt-3 relative">
          <input
            type="text"
            value="${state.searchQuery}"
            oninput="handleSearchInput(this.value)"
            placeholder="ابحث عن أكلة أو مطعم (مثلاً: كشري، جاد، شاورما، سلطة، ترمس)..."
            class="w-full bg-slate-900/90 text-white text-xs rounded-xl px-4 py-3 border border-white/15 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <!-- تصنيفات الأكل -->
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

// واجهة الخبير الذكي (AI Nutritionist + Gemini API)
function renderAiExpertView() {
  return `
    <div class="space-y-4 pb-6">
      <!-- بطاقة تعريف الخبير الذكي -->
      <div class="glass-card-highlight p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-extrabold text-white flex items-center gap-2">
            <span>🤖</span>
            <span>الخبير الغذائي المصري الذكي (AI)</span>
          </h2>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            يفهم العامية المصرية
          </span>
        </div>
        <p class="text-xs text-slate-300 mt-1">
          اكتب أي أكلة أكلتها من الشارع أو الدليفري أو البيت (مثلاً: "كلت رغيفين حواوشي وسلطة طحينة" أو "فطرت فول بالبيض وشربت شاي بلبن") وهحسبلك السعرات والألياف وأقولك تعمل إيه عشان ما تكسلش في الشغل!
        </p>
      </div>

      <!-- نموذج كتابة الوجبة السريعة -->
      <form onsubmit="handleSendAiMessage(event)" class="glass-card p-3.5 space-y-2.5">
        <label class="block text-xs font-bold text-emerald-300">✍️ احكيلي أكلت إيه أو ناوي تطلب إيه دليفري؟</label>
        <textarea
          id="ai-meal-input"
          rows="2"
          placeholder="مثال: طلبت علبة كشري وسط من التحرير وشربت كانز دايت وأنا شغال على اللابتوب..."
          class="w-full bg-slate-900/90 text-white text-xs rounded-xl p-3 border border-white/15 focus:outline-none focus:border-emerald-400"
        ></textarea>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="document.getElementById('ai-meal-input').value='فطرت ساندوتشين فول وطعمية بلدي وشربت قهوة سادة'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🥙 فطار فول وطعمية
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='اتغديت نص فرخة مشوية وسلطة خضراء و5 معالق رز'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🍗 غداء مشويات
          </button>
          <button type="button" onclick="document.getElementById('ai-meal-input').value='كلت 2 ساندوتش شاورما فراخ سوري بالتومية وبطاطس'" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
            🌯 شاورما سوري
          </button>
        </div>
        <button
          id="ai-send-btn"
          type="submit"
          class="ios-btn w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg"
        >
          🔍 حلل الوجبة واحسب الألياف والعناصر
        </button>
      </form>

      <!-- سجل المحادثة والتحليلات -->
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
                  <div><span class="text-purple-300 block text-[9px]">دهون</span><strong>${msg.parsedMeal.fats}جم</strong></div>
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

      <!-- إعداد مفتاح Gemini API الاختياري -->
      <div class="glass-card p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-extrabold text-white">🔑 ربط Google Gemini API (اختياري)</h4>
          <span class="text-[10px] ${
            state.geminiApiKey ? 'text-emerald-400' : 'text-amber-300'
          } font-bold">
            ${state.geminiApiKey ? 'متصل بـ Gemini AI ✅' : 'يعمل بالمحرك المصري المحلي الذكي ⚡'}
          </span>
        </div>
        <p class="text-[11px] text-slate-400">
          التطبيق يحلل الأكلات المصرية تلقائياً بدون إنترنت، ولو حابب ذكاء اصطناعي سحابي غير محدود تقدر تضيف مفتاح Gemini API المجاني من Google AI Studio (يُحفظ على موبايلك فقط).
        </p>
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

// واجهة المكملات الغذائية والتذكيرات الدورية
function renderSupplementsAndRemindersView() {
  const allSupps = [...window.DEFAULT_SUPPLEMENTS, ...state.customSupplements];
  const takenCount = allSupps.filter((s) => state.todayLog.supplementsTaken[s.id]).length;

  return `
    <div class="space-y-4 pb-6">
      <!-- ملخص المكملات -->
      <div class="glass-card-highlight p-4 flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-white">💊 مكملات الشغل المكتبي والتذكيرات</h2>
          <p class="text-xs text-slate-300 mt-0.5">
            أخدت <strong class="text-emerald-300">${takenCount} من ${allSupps.length}</strong> مكملات النهاردة
          </p>
        </div>
        <div class="text-2xl font-extrabold text-emerald-400">
          ${Math.round((takenCount / Math.max(allSupps.length, 1)) * 100)}%
        </div>
      </div>

      <!-- قائمة المكملات اليومية -->
      <div class="space-y-2.5">
        ${allSupps
          .map((supp) => {
            const isTaken = !!state.todayLog.supplementsTaken[supp.id];
            const isCustom = supp.id.startsWith('custom_supp_');
            return `
            <div class="glass-card p-3.5 border ${
              isTaken ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-white/10'
            }">
              <div class="flex items-start justify-between gap-3">
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
                      ⏰ الموعد: ${supp.timing} • الجرعة: ${supp.dosage}
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1">${supp.reason}</p>
                    <p class="text-[10px] text-amber-300/90 mt-1">⚠️ ${supp.warning}</p>
                  </div>
                </div>
                ${
                  isCustom
                    ? `<button onclick="deleteCustomSupplement('${supp.id}')" class="text-xs text-slate-500 hover:text-rose-400">✕</button>`
                    : ''
                }
              </div>
            </div>
          `;
          })
          .join('')}
      </div>

      <!-- إضافة مكمل غذائي جديد -->
      <form onsubmit="addCustomSupplement(event)" class="glass-card p-4 space-y-2.5">
        <h3 class="text-xs font-extrabold text-white">➕ أضف مكمل غذائي أو فيتامين خاص بك</h3>
        <div class="grid grid-cols-1 gap-2">
          <input
            id="custom-supp-name"
            type="text"
            required
            placeholder="اسم المكمل (مثلاً: زنك، حديد، كولاجين، كرياتين)..."
            class="bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15"
          />
          <div class="grid grid-cols-2 gap-2">
            <input
              id="custom-supp-dosage"
              type="text"
              placeholder="الجرعة (مثلاً: كبسولة 50 ملجم)"
              class="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15"
            />
            <input
              id="custom-supp-timing"
              type="text"
              placeholder="الموعد (مثلاً: بعد الغداء)"
              class="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-white/15"
            />
          </div>
        </div>
        <button type="submit" class="ios-btn w-full bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 font-bold text-xs py-2.5 rounded-xl">
          + حفظ المكمل في قائمتي اليومية
        </button>
      </form>

      <!-- قسم المنبهات والتذكيرات الذكية للشغل المكتبي -->
      <div class="glass-card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-extrabold text-white">🔔 منبهات المتابعة أثناء الشغل</h3>
            <p class="text-[11px] text-slate-400">بيفكرك تشرب مية، تقوم تتحرك، وتاخد الألياف والمكملات</p>
          </div>
          <button
            onclick="requestNotificationPermission()"
            class="ios-btn bg-emerald-500 text-slate-950 font-extrabold text-[11px] px-3 py-2 rounded-xl"
          >
            تفعيل إشعارات الآيفون
          </button>
        </div>

        <div class="space-y-2.5">
          ${state.reminders
            .map(
              (rem) => `
            <div class="bg-slate-900/75 p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2">
              <div class="flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-bold text-white">${rem.title}</span>
                  <span class="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-md">كل ${rem.intervalMinutes} د</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">${rem.description}</p>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  onclick="triggerTestReminder('${rem.id}')"
                  title="تجربة التنبيه الآن"
                  class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg"
                >
                  تجربة 🔔
                </button>
                <button
                  onclick="toggleReminder('${rem.id}')"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold ${
                    rem.enabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }"
                >
                  ${rem.enabled ? 'مفعل' : 'متوقف'}
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

// واجهة الملف الشخصي وطريقة التثبيت على الآيفون
function renderProfileView() {
  const p = state.profile;
  return `
    <div class="space-y-4 pb-6">
      <form onsubmit="saveProfileSettings(event)" class="glass-card p-4 space-y-3">
        <h2 class="text-base font-extrabold text-white">⚙️ بيانات جسمك وهدفك الغذائي</h2>
        <p class="text-xs text-slate-400">بيتم ضبط السعرات والألياف تلقائياً لتناسب قلة الحركة في الشغل المكتبي</p>

        <div>
          <label class="text-xs text-slate-300 font-bold block mb-1">الاسم أو اللقب</label>
          <input id="prof-name" type="text" value="${p.name}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الوزن (كجم)</label>
            <input id="prof-weight" type="number" value="${p.weight}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15" />
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

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-slate-300 font-bold block mb-1">الهدف الحالي</label>
            <select id="prof-goal" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-white/15">
              <option value="fat_loss" ${p.goal === 'fat_loss' ? 'selected' : ''}>تنشيف وخسارة الكرش المكتبي</option>
              <option value="maintain" ${p.goal === 'maintain' ? 'selected' : ''}>ثبات الوزن ورفع النشاط الذهني</option>
              <option value="muscle" ${p.goal === 'muscle' ? 'selected' : ''}>زيادة عضل صافي</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-emerald-300 font-bold block mb-1">هدف الألياف اليومي (جم)</label>
            <input id="prof-fiber" type="number" value="${p.targets.fiber}" class="w-full bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 border border-emerald-500/40" />
          </div>
        </div>

        <button type="submit" class="ios-btn w-full bg-emerald-500 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg">
          💾 حفظ وإعادة حساب السعرات والماكروز
        </button>
      </form>

      <!-- دليل تثبيت التطبيق على الآيفون و GitHub Pages -->
      <div class="glass-card p-4 space-y-2.5 border border-emerald-500/30">
        <h3 class="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
          <span>📱</span>
          <span>كيف تثبت التطبيق على شاشة الآيفون (iOS PWA)؟</span>
        </h3>
        <ol class="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>ارفع هذا المجلد على حسابك في <strong>GitHub</strong> وفعل ميزة <strong>GitHub Pages</strong> من الإعدادات.</li>
          <li>افتح رابط الموقع من متصفح <strong>Safari</strong> على الآيفون.</li>
          <li>اضغط على زر المشاركة <strong>Share</strong> (المربع الذي يخرج منه سهم للأعلى ⬆️ في أسفل الشاشة).</li>
          <li>اختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</li>
          <li>سيظهر التطبيق بأيقونته الخاصة على شاشة الآيفون ويعمل بكامل الشاشة والتنبيهات وبدون إنترنت تماماً مثل التطبيقات الأصلية!</li>
        </ol>
      </div>
    </div>
  `;
}

// الدالة الرئيسية لرسم التطبيق
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

  // تحديث شريط التبويبات السفلي (iOS Tab Bar)
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

// تشغيل التطبيق عند التحميل
window.addEventListener('DOMContentLoaded', () => {
  renderApp();
  setupReminderIntervals();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registration optional:', err);
    });
  }
});
