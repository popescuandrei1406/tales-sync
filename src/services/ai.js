import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;

if (API_KEY && API_KEY.startsWith("AIzaSy")) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.warn(
    "VITE_GEMINI_API_KEY is missing or invalid in .env. Using rich genre-appropriate fallback storytelling system."
  );
}

// We are using gemini-1.5-flash for maximum speed in multiplayer gaming
const MODEL_NAME = "gemini-1.5-flash";

const PLAYER_FALLBACKS = {
  "Horror": [
    "Umezeala bruscă din aer aducea un miros greu de fier și pământ reavăn. Din colțul întunecat al camerei, s-a auzit un oftat prelung, iar umbrele de pe perete au început să se miște singure, sfidând flacăra tremurândă a lumânării. Fiecare fibră a corpului îi urla să fugă, dar picioarele îi erau parcă țintuite în podeaua de lemn rece.",
    "Un zgomot metalic, ca o gheară zgâriind pe sticlă, a sfâșiat liniștea mormântală a nopții. Când s-a întors încet, a zărit două puncte de un galben bolnăvicios fixându-l direct prin geamul aburit. Înainte de a putea striga, geamul a început să crape lent, desenând o pânză de păianjen pe sticla rece.",
    "Lumina s-a stins brusc, lăsând în urmă doar ecoul unor pași grei și târșâiți care se apropiau pe coridor. Aerul a devenit atât de rece încât respirația i se transforma instantaneu în aburi fini. Apoi, o mână incredibil de rece și umedă s-a așezat încet pe umărul său amorțit."
  ],
  "SF": [
    "Senzorii de bord au început să emită semnale sonore frenetice, iar consola centrală s-a aprins într-un albastru intens. Ecranul principal înfățișa o anomalie gravitațională de proporții gigantice care înghițea lumina stelelor din jur. În mod bizar, timpul părea să curgă în sens invers pe ceasul digital al cabinei.",
    "Costumul spațial a raportat o scădere bruscă a nivelului de oxigen, în timp ce pe retina vizorului s-au proiectat simboluri geometrice străine. Solul planetei necunoscute pulsa sub cizmele sale, transmițând vibrații de frecvență joasă care sunau aproape ca o melodie matematică. Ceva din adâncuri încerca să comunice.",
    "O descărcare electromagnetică a resetat sistemele cibernetice ale coloniei, lăsându-i în întuneric total. Când generatorul de rezervă a pornit cu un pârâit metalic, toate androidele de pază erau aliniate în cerc, cu privirile fixe îndreptate spre tavanul de oțel, repetând la nesfârșit același cod binar."
  ],
  "Fantasy": [
    "Piatra prețioasă montată în mânerul vechii spade a pulsat într-o nuanță caldă de smarald, luminând runele antice gravate pe lama de oțel. În depărtare, copacii bătrâni ai pădurii s-au înclinat ca și cum ar fi salutat prezența unui vechi stăpân. O adiere de vânt parfumată cu flori de nufăr a risipit ceața de pe potecă.",
    "O siluetă învăluită într-o pelerină țesută din fire de argint s-a desprins din trunchiul unui stejar multisecular. Privirea ei, de o culoare violet nepământeană, purta înțelepciunea unor ere demult uitate de oameni. Cu un gest grațios al mâinii, a presărat un praf auriu care a transformat firele de iarbă în mici luminițe sclipitoare.",
    "Harta de pergament s-a ridicat singură în aer, plutind deasupra mesei de lemn, în timp ce linii de foc auriu desenau un nou traseu montan ascuns ochiului liber. Legendele erau reale: trecătoarea dragonilor se deschidea doar în noaptea cu lună sângerie."
  ],
  "Comedie": [
    "Fix în clipa în care trebuia să livreze discursul vieții sale, guma de mestecat i s-a lipit catastrofal de vârful nasului. Încercând să o îndepărteze discret, a dărâmat un decor întreg de flori direct peste primarul orașului, care s-a ales cu o vază pe post de cască medievală. Toată lumea a amuțit, în afară de un papagal extrem de zgomotos.",
    "Planul era perfect, cu o singură mică excepție: costumul de spion super-tehnologizat era cu trei mărimi mai mic și scotea un scârțâit de rață de cauciuc la fiecare pas. Când a încercat să sară gardul de securitate, s-a agățat cu pantalonii de o creangă de prun, rămânând suspendat în aer ca un ornament ciudat de Crăciun.",
    "S-a uitat cu mândrie la capodopera sa culinară, doar pentru a realiza că în loc de zahăr pudră folosise bicarbonat de sodiu în cantități industriale. În secunda următoare, prăjitura a început să se umfle ca un vulcan furios, revărsându-se spumos peste margini și înghițind încet pisica care privea uluită de pe frigider."
  ],
  "Dramă": [
    "Scrisoarea îi tremura în mână, iar rândurile scrise cu cerneală albastră se estompau sub lacrimile calde ce nu mai puteau fi oprite. Înțelesese în sfârșit că unele greșeli nu pot fi reparate, indiferent de cât de mult ne-am dori să dăm timpul înapoi. Gara era pustie, iar trenul tocmai plecase, lăsând în urmă doar un nor rece de abur.",
    "Privirile lor s-au întâlnit prin geamul ud de ploaie al cafenelei, o secundă lungă cât o eternitate în care s-au spus toate cuvintele nespuse. Niciunul nu a făcut gestul de a deschide ușa, știind amândoi că drumurile lor se despărțiseră iremediabil cu ani în urmă. S-a întors cu gulerul ridicat și s-a pierdut în mulțime.",
    "A privit tăcut tabloul de familie prăfuit de pe perete, realizând că acele zâmbete înghețate în timp aparțineau unei vieți care nu mai exista. Casa era acum doar o cochilie goală plină de ecouri și umbre. A stins lumina încet, lăsând trecutul în urmă în întuneric."
  ],
  "Mister": [
    "Printre paginile jurnalului vechi, a găsit o cheie din alamă extrem de ciudată, gravată cu o bufniță cu aripi desfăcute. Pe verso era trecut un singur număr de cameră și o dată calendaristică din viitor. Cum era posibil ca scrisul să fie exact al tatălui său, dispărut cu zece ani în urmă?",
    "Când a analizat cu lupa fotografia de epocă, un fior rece i-a străbătut spatele: în fundalul imaginii din 1920 se afla o persoană care purta exact același ceas digital pe care îl avea el la mână în acel moment. În plus, persoana respectivă îl privea direct în obiectiv cu un zâmbet complice.",
    "Ușa biroului secret, ascunsă în spatele bibliotecii, era întredeschisă, iar pe masa de lucru lampa era încă caldă. Un ceai din care încă ieșeau aburi stătea lângă un dosar sigilat pe care scria cu litere mari roșii: „NU DESCHIDEȚI SUB NICIO FORMĂ”."
  ],
  "Romance": [
    "Sub bolta cerească plină de stele căzătoare, atingerea degetelor lor a declanșat o căldură electrică ce părea să vindece toate rănile trecutului. Privirea ei caldă și sinceră i-a dat curajul de a rosti cuvintele pe care le ținuse ascunse în cel mai adânc colț al sufletului. Lumea din jur a dispărut pur și simplu.",
    "O adiere caldă de vară le purta râsetele de-a lungul plajei pustii, în timp ce valurile mării le mângâiau picioarele obosite. Când s-au oprit, el i-a aranjat ușor o șuviță de păr rătăcită după ureche, iar distanța dintre ei s-a topit instantaneu într-o îmbrățișare strânsă și plină de dor.",
    "Fiecare bătaie a inimii părea să rezoneze la unison cu a celeilalte în liniștea serii. Când privirile li s-au întâlnit în lumina difuză a felinarelor de pe pod, au realizat că nu mai era nevoie de niciun cuvânt; totul era deja scris în ochii lor."
  ],
  "Aventură": [
    "Fără să mai ezite, s-a aruncat în gol de pe stânca înaltă, prinzând în ultima secundă liana groasă care atârna deasupra prăpăstiei adânci. Cu un strigăt de triumf, a aterizat direct pe marginea de piatră a intrării secrete în templu, chiar înainte ca platforma de pe care sărise să se prăbușească cu zgomot.",
    "Harta din piele de căprioară indica o peșteră ascunsă chiar în spatele cascadei gigantice de pe muntele sacru. Strângând torța în mână, a pășit prin peretele dens de apă rece, descoperind un tunel lung sculptat în stâncă masivă, care strălucea datorită depozitelor de cristale naturale.",
    "Vântul puternic umfla pânzele corabiei, împingând-o cu viteză prin valurile înspumate ale oceanului spre o insulă care nu apărea pe nicio hartă modernă. Cu busola în mână și privirea ațintită spre orizont, căpitanul știa că legenda comorii pierdute era pe cale să devină reality." // reality -> realitate
  ]
};

// Fix the last adventure fallback typo 'reality' -> 'realitate'
PLAYER_FALLBACKS["Aventură"][2] = "Vântul puternic umfla pânzele corabiei, împingând-o cu viteză prin valurile înspumate ale oceanului spre o insulă care nu apărea pe nicio hartă modernă. Cu busola în mână și privirea ațintită spre orizont, căpitanul știa că legenda comorii pierdute era pe cale să devină realitate.";

const BRIDGE_FALLBACKS = {
  "Horror": [
    "Totuși, o atmosferă de coșmar a început să pună stăpânire pe împrejurimi...",
    "Dar din umbră, o prezență malefică pândea cu ochii ațintiți asupra lor...",
    "Însă liniștea a fost spulberată de un sunet terifiant ce venea de sub podea..."
  ],
  "SF": [
    "Deodată, o hologramă albastră a apărut din senin, proiectând un mesaj codat...",
    "În acel moment, gravitația a început să scadă, iar obiectele au început să plutească...",
    "Brusc, ecranele electronice au luat-o razna, afișând o numărătoare inversă misterioasă..."
  ],
  "Fantasy": [
    "Între timp, o strălucire magică a început să izvorască din pietrele străvechi...",
    "Apoi, o adiere de vânt fermecată a adus cu ea parfum de flori nemuritoare...",
    "În mod miraculos, o creatură cu aripi de cleștar s-a așezat pe umărul său..."
  ],
  "Comedie": [
    "În mod absurd, fix atunci o capră buclucașă a intrat pe ușă mâncând o hartă...",
    "Din păcate pentru ei, un zgomot extrem de ridicol le-a dat toate planurile peste cap...",
    "Dar distracția abia începea, mai ales când o ploaie de clătite a început să cadă..."
  ],
  "Dramă": [
    "Cu toate acestea, o durere profundă mocnea în sufletul fiecărui personaj...",
    "Însă adevărul crud era pe cale să iasă la iveală, amenințând să distrugă totul...",
    "Dar un secret teribil păstrat de ani de zile nu mai putea fi ascuns acum..."
  ],
  "Mister": [
    "Însă un detaliu bizar lăsat la vedere schimba complet datele problemei...",
    "Deodată, au realizat că o cheie aurie lipsea de pe panoul de la intrare...",
    "Dar o umbră furișându-se pe coridor a atras atenția tuturor celor prezenți..."
  ],
  "Romance": [
    "Dar o privire intensă și plină de înțeles a făcut ca inimile lor să bată mai tare...",
    "Apoi, o atingere delicată a mâinilor a risipit orice urmă de îndoială și teamă...",
    "Însă destinul părea să-i aducă din ce în ce mai aproape unul de celălalt..."
  ],
  "Aventură": [
    "Fără să mai piardă nicio secundă, o nouă pistă palpitantă le-a apărut în cale...",
    "Dar o prăbușire neașteptată de stânci a blocat singura cale de întoarcere...",
    "Însă spiritul de explorator i-a împins să facă un salt periculos peste prăpastie..."
  ]
};

const INTRO_FALLBACKS = [
  "Într-un oraș acoperit de o ceață densă și misterioasă, clopotul vechi al catedralei a bătut de treisprezece ori, deși era abia miezul nopții. Oamenii și-au încuiat grăbiți ușile, simțind că ceva neobișnuit plutește în aer.",
  "La marginea regatului, un portal străvechi din piatră de obsidian a început să pulseze cu o lumină purpurie, emanând valuri de energie uitată. Ultimul gardian a privit uluit cum runele prind viață după mii de ani de tăcere.",
  "Nava de explorare spațială a recepționat un semnal de SOS provenind dintr-o zonă complet pustie a galaxiei, cunoscută sub numele de Sectorul Mort. Când căpitanul a ordonat scanarea, pe radare a apărut o structură artificială de dimensiuni planetare."
];

// Helper to normalize text for duplicate checking
function normalizeText(txt) {
  if (!txt) return "";
  return txt
    .toLowerCase()
    .replace(/[^a-zăâîșț0-9]/gi, "")
    .replace(/\s+/g, "");
}

// Fallback Generators with Duplicate Prevention
export function generateIntroFallback(genres = []) {
  const randomIndex = Math.floor(Math.random() * INTRO_FALLBACKS.length);
  return INTRO_FALLBACKS[randomIndex];
}

export function generatePlayerPartFallback(previousPartText, genre) {
  const fallbacks = PLAYER_FALLBACKS[genre] || PLAYER_FALLBACKS["Mister"];
  
  const normalizedStory = normalizeText(previousPartText);
  const unusedFallbacks = fallbacks.filter(f => {
    const signature = normalizeText(f.slice(0, 30));
    return !normalizedStory.includes(signature);
  });
  
  const listToUse = unusedFallbacks.length > 0 ? unusedFallbacks : fallbacks;
  const randomIndex = Math.floor(Math.random() * listToUse.length);
  return listToUse[randomIndex];
}

export function generateBridgeFallback(previousPartText, nextGenre) {
  const fallbacks = BRIDGE_FALLBACKS[nextGenre] || BRIDGE_FALLBACKS["Mister"];
  
  const normalizedStory = normalizeText(previousPartText);
  const unusedFallbacks = fallbacks.filter(f => {
    const signature = normalizeText(f.slice(0, 20));
    return !normalizedStory.includes(signature);
  });
  
  const listToUse = unusedFallbacks.length > 0 ? unusedFallbacks : fallbacks;
  const randomIndex = Math.floor(Math.random() * listToUse.length);
  return listToUse[randomIndex];
}

// Main API Wrappers
export async function generateIntro(genres) {
  if (!genAI) {
    return generateIntroFallback(genres);
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = `
Ești povestitorul principal (Game Master) al unui joc numit Tales Sync.
Trebuie să creezi o INTRODUCERE (maxim 2-3 propoziții captivante) pentru o poveste care ar putea include genurile: ${genres.join(
    ", "
  )}.
Introducerea trebuie să fie scurtă, intrigantă și să lase loc jucătorului următor să continue cu expozițiunea. Scrie în limba română. Nu folosi formule de salut, scrie doar textul poveștii.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI Intro Error:", error);
    return generateIntroFallback(genres);
  }
}

export async function generatePlayerPart(previousPartText, genre) {
  if (!genAI) {
    return generatePlayerPartFallback(previousPartText, genre);
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = `
Ești povestitorul secundar într-un joc colaborativ de scris numit Tales Sync.
Ultimul jucător a rămas fără timp sau a ales să lase AI-ul să îi scrie tura.
Contextul de până acum al poveștii este:
"${previousPartText}"

Sarcina ta este să adaugi următorul capitol de acțiune al poveștii (exact 2-3 propoziții captivante și bine construite), respectând cu strictețe genul literar: ${genre}.
Scrie direct continuarea poveștii în limba română, la persoana a 3-a. Nu folosi formule de salut sau titluri. Fii extrem de creativ.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI Player Part Generation Error:", error);
    return generatePlayerPartFallback(previousPartText, genre);
  }
}

export async function generateBridge(previousPart, nextGenre) {
  if (!genAI) {
    return generateBridgeFallback(previousPart, nextGenre);
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prompt = `
Ești povestitorul principal într-un joc colaborativ de scris.
Ultima parte a poveștii scrisă de un jucător este următoarea:
"${previousPart}"

Sarcina ta este să adaugi o Punte de Legătură (un bridge de 1-2 propoziții) care să continue ideea și să facă trecerea către genul următor, care este: ${nextGenre}.
Puntea de legătură trebuie să lase suspans pentru ca următorul jucător să o poată prelua ușor.
ATENȚIE: NU rescrie partea anterioară. Dă-mi DOAR propozițiile de legătură pe care le adaugi în continuare. Scrie în limba română, la persoana a 3-a.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI Bridge Error:", error);
    return generateBridgeFallback(previousPart, nextGenre);
  }
}
