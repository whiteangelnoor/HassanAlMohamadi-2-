# وحدة المحرّك الفلكي

المحرّك الحسابي للتطبيق: المكتبة السويسرية الأصلية مدمجة داخل التطبيق كوحدة أصلية واحدة تعمل على الأندرويد والآيفون، بلا إنترنت.

الرخصة: الرخصة العامة المفتوحة (الإصدار الثالث أو أحدث). ملف الرخصة في جذر المجلد.

---

## نتيجة اختبار الدقة

قورن المحرّك بالأداة المرجعية الرسمية للمكتبة السويسرية على 300 خريطة عشوائية بين عامي 1800 و2399، بمواقع عشوائية وأنظمة بيوت مختلفة:

- أقصى فرق في مواقع الكواكب: 0.00018 ثانية قوسية
- أقصى فرق في رؤوس البيوت: 0.00018 ثانية قوسية

هذا الفرق ناتج فقط عن تقريب الأداة المرجعية عند الطباعة، أي أن النتائج متطابقة.

لإعادة الاختبار:

```bash
python3 tests/compare_with_swetest.py <astrotest-binary> <swetest> <ephe-dir>
```

---

## محتوى المجلد

```
specs/NativeAstroEngine.ts          تعريف الوحدة لمولّد الكود
shared/NativeAstroEngine.h|.cpp     ربط الوحدة بالتطبيق
shared/astrocore/AstroCore.h|.cpp   المحرّك نفسه
shared/astrocore/json.hpp           مكتبة قراءة البيانات (رخصة حرة)
shared/swisseph/                    كود المكتبة السويسرية الأصلي (الإصدار 2.10.03)
src/astro/engine.ts                 الواجهة المكتوبة التي تستخدمها الشاشات
android/app/src/main/jni/CMakeLists.txt
ios/NativeAstroEngineProvider.h|.mm
assets/ephe/                        ملفات الجداول (حوالي 2.1 ميغابايت)
tests/                              اختبارات الدقة على الحاسوب
```

ملفات الجداول المرفقة تغطي الفترة من 1800 إلى 2400 ميلادي للكواكب والقمر والكويكبات الرئيسية، مع ملف النجوم الثابتة. أي تاريخ خارج هذه الفترة يرفضه المحرّك بخطأ واضح بدل أن يحسب بدقة أقل بصمت.

---

## الدمج في مشروع التطبيق

المرجع: دليل الوحدات الأصلية المشتركة في الموقع الرسمي، الإصدار 0.87.

### 1. نسخ الملفات

انسخ إلى جذر المشروع: `specs` و`shared` و`src/astro`.

### 2. إعداد مولّد الكود في `package.json`

```json
"codegenConfig": {
  "name": "AppSpecs",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": { "javaPackageName": "com.yourapp.specs" },
  "ios": {
    "modulesProvider": { "NativeAstroEngine": "NativeAstroEngineProvider" }
  }
}
```

### 3. الأندرويد

- انسخ `android/app/src/main/jni/CMakeLists.txt` إلى نفس المسار.
- أضف داخل كتلة `android` في `android/app/build.gradle`:

```gradle
externalNativeBuild {
    cmake { path "src/main/jni/CMakeLists.txt" }
}
```

- نزّل ملف التحميل الافتراضي داخل مجلد `jni`:

```bash
curl -O https://raw.githubusercontent.com/react/react-native/v0.87.0/packages/react-native/ReactAndroid/cmake-utils/default-app-setup/OnLoad.cpp
```

- عدّله هكذا:

```cpp
#include <NativeAstroEngine.h>
// ...
std::shared_ptr<TurboModule> cxxModuleProvider(
    const std::string& name,
    const std::shared_ptr<CallInvoker>& jsInvoker) {
  if (name == NativeAstroEngine::kModuleName) {
    return std::make_shared<NativeAstroEngine>(jsInvoker);
  }
  return autolinking_cxxModuleProvider(name, jsInvoker);
}
```

### 4. الآيفون

```bash
cd ios && bundle install && bundle exec pod install
```

- افتح مساحة العمل في إكس كود، وأضف مجلد `shared` كاملاً للمشروع.
- أضف الملفين `NativeAstroEngineProvider.h` و`NativeAstroEngineProvider.mm`.
- أعد تشغيل تثبيت الحزم بعد تعديل `package.json`.

### 5. التشغيل

```ts
import {AstroEngine} from './src/astro/engine';

AstroEngine.initialize(ephePathOnDevice);

const chart = AstroEngine.chart({
  time: {utc: {year: 1990, month: 6, day: 15, hour: 12}},
  location: {lat: 33.3152, lon: 44.3661},
  houseSystem: 'P',
});
```

---

## ما يجب معرفته

- **ملفات الجداول على الجهاز:** المكتبة تقرأ الملفات من مسار حقيقي على الجهاز. في الآيفون يمكن استخدام مسار حزمة التطبيق مباشرة. في الأندرويد يجب نسخ الملفات من الأصول إلى مجلد ملفات التطبيق عند أول تشغيل. هذه الخطوة جزء من الوحدة التالية (هيكل التطبيق).
- **الوقت:** المحرّك يستقبل الوقت العالمي المنسّق. تحويل التوقيت المحلي التاريخي إلى العالمي (مع التوقيت الصيفي القديم) وحدة مستقلة قادمة.
- **التزامن:** كل الاستدعاءات متسلسلة داخلياً لأن المكتبة السويسرية تحتفظ بحالة عامة.
- **الدوائر القطبية:** بعض أنظمة البيوت لا تعمل قرب القطبين؛ يُستخدم نظام بديل ويُعاد تحذير صريح في النتيجة.

---

## واجهة المحرّك

| الدالة | الغرض |
|---|---|
| `initialize(path)` | تهيئة المحرّك والتحقق من قراءة الملفات |
| `chart(request)` | خريطة كاملة: مواقع، سرعات، ميل، صعود مستقيم، بيوت، موقع كل كوكب في البيوت |
| `series(request)` | حساب عدد كبير من اللحظات دفعة واحدة (عبور، تقويم، بحث عن المحطات) |
| `fixedStars(request)` | النجوم الثابتة بالاسم |
| `houseSystems()` | قائمة أنظمة البيوت المتاحة (25 نظاماً) |
| `ayanamsas()` | قائمة أنظمة الإزاحة النجمية |

أسماء الأجسام المتاحة: الشمس والقمر والكواكب حتى بلوتو، العقدة المتوسطة والحقيقية، ليليث المتوسطة والمتذبذبة، كيرون، فولوس، سيريس، بالاس، جونو، فيستا، وأي كويكب برقمه بالصيغة `ast:رقم` بشرط توفّر ملفه.
