/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Check,
  Phone,
  MapPin,
  Car,
  ExternalLink,
  AlertCircle,
  CalendarCheck,
  LogOut,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import heroMechanicImg from './assets/hero-mechanic.jpg';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from './services/googleAuth';
import {
  OWNER_CALENDAR_EMAIL,
  createGoogleCalendarEvent,
  buildGoogleCalendarWebUrl,
  type GoogleCalendarEventResult,
  type BookingDataForCalendar,
} from './services/calendarService';
import { OwnerAdminModal } from './components/OwnerAdminModal';

// TYPES
type PageTab = 'home' | 'services' | 'about' | 'pricing' | 'contact' | 'booking';

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  duration: string;
  category: string;
  description: string;
  imageUrl: string;
  details: string[];
}

interface AvailableDate {
  dateString: string;
  dayShort: string;
  dayName: string;
  formatted: string;
  fullLabel: string;
}

type BookingData = BookingDataForCalendar;

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

// SERVICES PORTFOLIO
const SERVICES: ServiceItem[] = [
  {
    id: 'plechove-disky',
    name: 'Kompletné prezutie (Plechové disky)',
    price: '35 €',
    duration: '30 min',
    category: 'Pneuservis',
    description: 'Demontáž z auta, vyzutie, obutie, vyváženie plechových diskov a opätovná montáž s kontrolou tlaku.',
    imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=800&q=80',
    details: ['Vhodné pre všetky rozmery oceľových diskov', 'Vyvažovacie závažia v cene', 'Vizuálna kontrola dezénu a ventilov'],
  },
  {
    id: 'elektrony',
    name: 'Kompletné prezutie (Elektróny)',
    price: '45 €',
    duration: '40 min',
    category: 'Pneuservis',
    description: 'Šetrné prezutie zliatinových diskov s použitím plastových ochranných prvkov a presné vyváženie s lepenými závažiami.',
    imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    details: ['Ochranné návleky proti poškodeniu laku', 'Doťahovanie momentovým kľúčom na predpísaný moment', 'Presné vyváženie eliminujúce vibrácie pri jazde'],
  },
  {
    id: 'geometria',
    name: '3D laserová geometria kolies',
    price: '40 €',
    duration: '30 min',
    category: 'Podvozok & Nápravy',
    description: 'Laserové 3D meranie a nastavenie zbiehavosti oboch náprav na certifikovanej stolici John Bean pre perfektnú stabilitu.',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    details: ['Meranie prednej aj zadnej nápravy', 'Tlač presného protokolu pred a po nastavení', 'Zamedzenie nerovnomernému opotrebovaniu pneumatík'],
  },
  {
    id: 'olej-servis',
    name: 'Výmena oleja a základný servis',
    price: '60 €',
    duration: '60 min',
    category: 'Motor & Údržba',
    description: 'Vypustenie starého motorového oleja, výmena olejového filtra, nová tesniaca podložka a kontrola prevádzkových kvapalín.',
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    details: ['Ekologická likvidácia použitého oleja', 'Kontrola bodu varu brzdovej kvapaliny', 'Vizuálna previerka bŕzd a vôle na podvozku'],
  },
  {
    id: 'diagnostika',
    name: 'Počítačová autodiagnostika',
    price: '25 €',
    duration: '30 min',
    category: 'Elektronika',
    description: 'Komplexné vyčítanie pamäte závad všetkých riadiacich jednotiek motora, ABS, ESP a komfortných systémov.',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    details: ['Multiznačková profesionálna diagnostika', 'Zmazanie chybových kódov a reset intervalov', 'Osobná konzultácia závad priamo s technikom'],
  },
  {
    id: 'brzdy',
    name: 'Servis a kontrola bŕzd',
    price: '50 €',
    duration: '45 min',
    category: 'Brzdový systém',
    description: 'Kontrola hrúbky brzdových kotúčov a platničiek, premazanie vodiacich čapov a test brzdovej kvapaliny.',
    imageUrl: 'https://images.unsplash.com/photo-1600793575654-910699b5e4d4?auto=format&fit=crop&w=800&q=80',
    details: ['Meranie ovality a hrúbky kotúčov mikrometrom', 'Čistenie strmeňov od brzdového prachu', 'Nastavenie parkovacej brzdy'],
  },
];

const TIME_SLOTS: string[] = ['08:00', '09:00', '10:30', '13:00', '14:30', '16:00'];

const FAQS: FaqItem[] = [
  {
    id: '1',
    question: 'Ako spoznám, že je potrebné nastaviť 3D geometriu?',
    answer: 'Ak vaše auto pri jazde po rovnej ceste mierne ťahá do strany, volant pri priamom smere nie je vodorovne, alebo vidíte, že sa pneumatika z vnútornej či vonkajšej strany zbieha rýchlejšie ako zvyšok dezénu.',
  },
  {
    id: '2',
    question: 'Je potrebné sa na prezutie vopred objednať?',
    answer: 'Odporúčame online rezerváciu termínu. Vyhnete sa tak akémukoľvek čakaniu – vaše vozidlo ide do dielne presne v dohodnutý čas.',
  },
  {
    id: '3',
    question: 'Aké vybavenie používate pri servise a geometrii?',
    answer: 'Pracujeme s modernou 3D laserovou geometriou John Bean, profesionálnymi vyvažovačkami pneumatík Hofmann a špičkovou multiznačkovou diagnostikou riadiacich jednotiek.',
  },
  {
    id: '4',
    question: 'Kde presne sídli Autoservis Auto Life Plus?',
    answer: 'Nájdete nás na Myslenickej ulici č. 3 v Pezinku (časť Grinava) priamo pri hlavnom ťahu. Máme vyhradené bezplatné parkovanie priamo pred servisnou bránou.',
  },
];

// SVG GOLDEN STAR COMPONENT
function StarIcon({ className = "w-3.5 h-3.5 fill-amber-400 text-amber-400" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

// GENERATE UPCOMING WORKING DATES
function generateAvailableDates(): AvailableDate[] {
  const dates: AvailableDate[] = [];
  const slovakDaysShort = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pia', 'So'];
  const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
  const slovakMonths = [
    'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
    'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'
  ];

  const current = new Date();
  current.setDate(current.getDate() + 1);

  while (dates.length < 6) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      const day = current.getDate();
      const monthIndex = current.getMonth();
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = monthIndex + 1 < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
      const year = current.getFullYear();

      dates.push({
        dateString: `${year}-${monthStr}-${dayStr}`,
        dayShort: slovakDaysShort[dayOfWeek],
        dayName: slovakDays[dayOfWeek],
        formatted: `${dayStr}.${monthStr}.`,
        fullLabel: `${slovakDays[dayOfWeek]}, ${day}. ${slovakMonths[monthIndex]} ${year}`,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// SAFE RESILIENT IMAGE COMPONENT
function SafeImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
}

// CINEMATIC WORKSHOP BACKGROUND COMPONENT (PHOTOREALISTIC WITH ATMOSPHERIC LIGHTING)
function HeroWorkshopArtwork() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* High-res local automotive photo of workshop with car on lift and mechanic */}
      <img
        src={heroMechanicImg}
        alt="Dielňa autoservisu a pneuservisu Auto Life Plus"
        className="w-full h-full object-cover object-center sm:object-right opacity-85 sm:opacity-85 scale-105"
      />

      {/* Atmospheric warm inspection work-light glow on the vehicle & suspension */}
      <div className="absolute right-[5%] sm:right-[18%] top-[15%] sm:top-[30%] w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-amber-400/30 blur-3xl pointer-events-none" />

      {/* Desktop gradient overlay: smooth contrast on left, revealing the car and mechanic on right */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/75 to-neutral-950/25 hidden sm:block" />

      {/* Mobile-specific gradient: text remains sharp while the workshop photo is clearly visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/55 to-neutral-950/75 sm:hidden" />

      {/* Top subtle blend under liquid glass navbar */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-neutral-950/80 to-transparent" />
    </div>
  );
}

export default function App() {
  const serviceSelectionRadioId = useId();
  const availableDates = React.useMemo(() => generateAvailableDates(), []);
  const bookingSectionRef = useRef<HTMLDivElement>(null);

  // NAVIGATION TAB STATE ('home' has the full rich landing page)
  const [currentTab, setCurrentTab] = useState<PageTab>('home');

  // Track scroll position to reveal header only when scrolling
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reservation form state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('plechove-disky');
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]?.dateString || '');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');

  // Customer details
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [carBrand, setCarBrand] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingData | null>(null);
  const [customerNote, setCustomerNote] = useState<string>('');

  // Owner Backend Google Calendar state (for OWNER_CALENDAR_EMAIL: krekan.dev@gmail.com)
  const [ownerUser, setOwnerUser] = useState<User | null>(null);
  const [ownerAccessToken, setOwnerAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isOwnerAdminOpen, setIsOwnerAdminOpen] = useState<boolean>(false);

  // Persistent bookings list (simulating backend database)
  const [allBookings, setAllBookings] = useState<BookingDataForCalendar[]>(() => {
    try {
      const saved = localStorage.getItem('autolife_bookings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'seed-1',
        serviceId: 'plechove-disky',
        serviceName: 'Kompletné prezutie (Plechové disky)',
        servicePrice: '35 €',
        duration: '30 min',
        date: availableDates[0]?.dateString || '2026-10-09',
        fullDateLabel: availableDates[0]?.fullLabel || 'Piatok, 9. októbra',
        time: '10:00',
        fullName: 'Ján Novák',
        phone: '0912 345 678',
        licensePlate: 'PK 987CD',
        carBrand: 'Škoda Octavia Combi',
        note: 'Pneumatiky sú v kufri, prosím skontrolovať tlak.',
        createdAt: new Date().toISOString(),
        calendarSynced: false,
      },
    ];
  });

  // Initialize Firebase Auth listener for owner
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setOwnerUser(user);
        if (token) setOwnerAccessToken(token);
      },
      () => {
        setOwnerUser(null);
        setOwnerAccessToken(null);
      }
    );

    // Open admin if #admin or ?admin=1 in URL
    if (window.location.search.includes('admin') || window.location.hash.includes('admin')) {
      setIsOwnerAdminOpen(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // FAQ accordion state
  const [openFaqId, setOpenFaqId] = useState<string | null>('1');

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId) || SERVICES[0];
  const selectedDateObj = availableDates.find((d) => d.dateString === selectedDate) || availableDates[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOwnerLogin = async (): Promise<string | null> => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setOwnerUser(result.user);
      setOwnerAccessToken(result.accessToken);
      showToast(`Google Kalendár majiteľa pripojený: ${result.user.email || OWNER_CALENDAR_EMAIL}`);
      return result.accessToken;
    } catch (err: unknown) {
      console.error('Owner login error:', err);
      showToast('Prihlásenie majiteľa cez Google bolo prerušené.');
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOwnerLogout = async (): Promise<void> => {
    try {
      await googleSignOut();
      setOwnerUser(null);
      setOwnerAccessToken(null);
      showToast('Google účet majiteľa bol odhlásený.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleUpdateBooking = (updated: BookingDataForCalendar) => {
    setAllBookings((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? updated : b));
      try {
        localStorage.setItem('autolife_bookings', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleAddTestBooking = () => {
    const testItem: BookingDataForCalendar = {
      id: `rez-test-${Date.now()}`,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      duration: selectedService.duration,
      date: availableDates[1]?.dateString || availableDates[0]?.dateString,
      fullDateLabel: availableDates[1]?.fullLabel || availableDates[0]?.fullLabel,
      time: '14:30',
      fullName: 'Michal Testovací',
      phone: '0903 111 222',
      licensePlate: 'PK 123XX',
      carBrand: 'Volkswagen Passat Variant',
      note: 'Testovacia rezervácia z administračného panelu.',
      createdAt: new Date().toISOString(),
      calendarSynced: false,
    };
    const nextList = [testItem, ...allBookings];
    setAllBookings(nextList);
    try {
      localStorage.setItem('autolife_bookings', JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
    }
    showToast('Testovacia rezervácia bola pridaná.');
  };

  const navigateToTab = (tab: PageTab, serviceId?: string) => {
    if (serviceId) {
      setSelectedServiceId(serviceId);
      setCurrentStep(2);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBooking = (serviceId?: string) => {
    if (serviceId) {
      setSelectedServiceId(serviceId);
      setCurrentStep(2);
    }
    if (currentTab !== 'home') {
      setCurrentTab('home');
      setTimeout(() => {
        bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDirections = () => {
    const url = 'https://www.google.com/maps/dir/?api=1&destination=Myslenick%C3%A1+3%2C+902+03+Pezinok';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveContact = () => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Autoservis Auto Life Plus',
      'ORG:Auto Life Plus',
      'TEL;TYPE=WORK,VOICE:0903301789',
      'ADR;TYPE=WORK:;;Myslenická 3;Pezinok - Grinava;;902 03;Slovensko',
      'NOTE:Autoservis a Pneuservis Pezinok Grinava',
      'END:VCARD'
    ].join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Autoservis_Auto_Life_Plus.vcf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Vizitka servisu bola stiahnutá.');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Zadajte vaše meno a priezvisko';
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Zadajte telefónne číslo';
    } else if (cleanPhone.length < 9) {
      newErrors.phone = 'Neplatný formát telefónneho čísla';
    }

    if (!licensePlate.trim()) {
      newErrors.licensePlate = 'Zadajte EČV (ŠPZ)';
    }

    if (!carBrand.trim()) {
      newErrors.carBrand = 'Zadajte značku a model auta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const booking: BookingData = {
      id: `rez-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      duration: selectedService.duration,
      date: selectedDate,
      fullDateLabel: selectedDateObj?.fullLabel || selectedDate,
      time: selectedTime,
      fullName: fullName.trim(),
      phone: phone.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      carBrand: carBrand.trim(),
      note: customerNote.trim() || undefined,
      createdAt: new Date().toISOString(),
      calendarSynced: false,
    };

    // Save locally
    const nextBookings = [booking, ...allBookings];
    setAllBookings(nextBookings);
    try {
      localStorage.setItem('autolife_bookings', JSON.stringify(nextBookings));
    } catch (e) {
      console.error(e);
    }

    setConfirmedBooking(booking);
    setIsSubmitted(true);

    // Backend auto-sync to owner's Google Calendar if owner is currently authenticated
    if (ownerAccessToken) {
      createGoogleCalendarEvent(booking, ownerAccessToken)
        .then((res) => {
          const synced: BookingData = {
            ...booking,
            calendarSynced: true,
            calendarEventId: res.id,
            calendarEventLink: res.htmlLink,
          };
          setAllBookings((prev) => {
            const updated = prev.map((b) => (b.id === booking.id ? synced : b));
            try {
              localStorage.setItem('autolife_bookings', JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
            return updated;
          });
        })
        .catch((err) => {
          console.error('Owner background calendar sync error:', err);
        });
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setConfirmedBooking(null);
    setCurrentStep(1);
    setSelectedServiceId(SERVICES[0].id);
    setSelectedDate(availableDates[0]?.dateString || '');
    setSelectedTime('09:00');
    setFullName('');
    setPhone('');
    setLicensePlate('');
    setCarBrand('');
    setCustomerNote('');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between antialiased selection:bg-red-600 selection:text-white">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HORNÁ NAVIGÁCIA (NA PC SA ZOBRAZÍ HNEĎ SO SLIDE-IN EFEKTOM ZHORA, NA MOBILE PRI SCROLLOVANÍ) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-neutral-950/85 backdrop-blur-md border-b border-white/10 text-white transition-all duration-300 shadow-md ${
          isScrolled || currentTab !== 'home'
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'max-md:-translate-y-full max-md:opacity-0 max-md:pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto'
        } md:animate-header-slide-down`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          <button
            type="button"
            onClick={() => navigateToTab('home')}
            className="text-left"
          >
            <span className="text-lg sm:text-xl font-black tracking-tight text-white uppercase block">
              Auto Life Plus
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-neutral-400 block -mt-1">
              Autoservis & Pneuservis · Pezinok
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-xs uppercase tracking-wider font-bold">
            <button
              onClick={() => navigateToTab('home')}
              className={`pb-1 border-b-2 transition-colors ${
                currentTab === 'home' ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-300 hover:text-white'
              }`}
            >
              Domov
            </button>
            <button
              onClick={() => navigateToTab('about')}
              className={`pb-1 border-b-2 transition-colors ${
                currentTab === 'about' ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-300 hover:text-white'
              }`}
            >
              O servise
            </button>
            <button
              onClick={() => navigateToTab('services')}
              className={`pb-1 border-b-2 transition-colors ${
                currentTab === 'services' ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-300 hover:text-white'
              }`}
            >
              Služby
            </button>
            <button
              onClick={() => navigateToTab('pricing')}
              className={`pb-1 border-b-2 transition-colors ${
                currentTab === 'pricing' ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-300 hover:text-white'
              }`}
            >
              Cenník
            </button>
            <button
              onClick={() => navigateToTab('contact')}
              className={`pb-1 border-b-2 transition-colors ${
                currentTab === 'contact' ? 'border-red-500 text-red-400' : 'border-transparent text-neutral-300 hover:text-white'
              }`}
            >
              Kontakt
            </button>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="tel:0903301789"
              className="hidden lg:flex items-center gap-1.5 font-bold text-xs text-red-400 hover:text-red-300"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>0903 301 789</span>
            </a>

            {/* Diskrétna indikácia pre prihláseného majiteľa servisu */}
            {ownerUser && (
              <button
                type="button"
                onClick={() => setIsOwnerAdminOpen(true)}
                className="hidden sm:flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 hover:border-neutral-500 px-3 py-1.5 rounded-full text-xs text-neutral-200 transition-colors"
                title={`Správa servisu & Kalendár (${ownerUser.email})`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] font-semibold">Správa servisu</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollToBooking()}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center gap-2 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Rezervovať</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUBPAGE 1: HLAVNÁ LANDING PAGE */}
      {currentTab === 'home' && (
        <main className="flex-1">

          {/* HERO SEKCIA: FULL-BLEED (ÚPLNE PO OKRAJ AŽ POD LIQUID GLASS, BEZ MEDZIER) */}
          <section className="relative w-full bg-neutral-950 text-white overflow-hidden border-b border-neutral-800">
            
            {/* Realistické fotografické pozadie dielne & inšpekčného svetla */}
            <HeroWorkshopArtwork />

            {/* Obsah zarovnaný v kontajneri s vysokým kontrastom na mobile aj PC */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-14 sm:pt-28 sm:pb-24 lg:pt-32 lg:pb-28">
              <div className="max-w-2xl">
                
                {/* Zväčšený masívny, dokonale čitateľný nadpis */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.04] drop-shadow-md">
                  Váš lokálny <span className="text-red-500">autoservis</span> a pneuservis
                </h1>

                {/* Sprievodný text s vysokým kontrastom a čitateľnosťou na akomkoľvek displeji */}
                <p className="text-sm sm:text-base lg:text-lg text-neutral-200 mt-4 sm:mt-5 leading-relaxed font-normal max-w-xl drop-shadow-sm">
                  Rýchla a precízna diagnostika motora a bŕzd, certifikovaná 3D laserová geometria John Bean a profesionálne prezutie kolies bez čakania na Myslenickej 3 v Grinave.
                </p>

                {/* Akčné tlačidlá v štýle Image 3 */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <a
                    href="tel:0903301789"
                    className="px-6 sm:px-7 py-3.5 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2.5 group"
                  >
                    <Phone className="w-4 h-4 text-white" />
                    <span>Volať: 0903 301 789</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => scrollToBooking()}
                    className="px-6 sm:px-7 py-3.5 sm:py-4 bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/20 hover:border-white/40 font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all flex items-center gap-2.5 shadow-md"
                  >
                    <Calendar className="w-4 h-4 text-red-400" />
                    <span>Rezervovať termín online</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Spodná lišta hodnotenia s perfektným kontrastom */}
                <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-neutral-800 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-neutral-300">
                  <div className="flex items-center gap-2 bg-neutral-900/90 px-3.5 py-1.5 rounded-lg border border-neutral-800 shadow-xs">
                    <span className="font-extrabold text-white">Google 4.7</span>
                    <div className="flex items-center gap-0.5">
                      <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                  </div>

                  <span className="font-medium text-neutral-300">
                    12 overených recenzií
                  </span>
                </div>

              </div>
            </div>

          </section>

          {/* 4 RÝCHLE PILIERE HNEĎ POD HERO BANNEROM */}
          <section className="bg-white py-4 sm:py-6 border-b border-neutral-100 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                <button
                  type="button"
                  onClick={() => scrollToBooking('plechove-disky')}
                  className="bg-neutral-50 hover:bg-neutral-100 rounded-2xl p-3.5 sm:p-4 border border-neutral-200 flex items-center gap-3 text-left transition-colors"
                >
                  <Car className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">Pneuservis & prezutie</span>
                    <span className="text-[11px] text-neutral-500 hidden sm:block">Plechové aj elektróny</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToBooking('geometria')}
                  className="bg-neutral-50 hover:bg-neutral-100 rounded-2xl p-3.5 sm:p-4 border border-neutral-200 flex items-center gap-3 text-left transition-colors"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">3D laserová geometria</span>
                    <span className="text-[11px] text-neutral-500 hidden sm:block">Certifikát John Bean</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToBooking('olej-servis')}
                  className="bg-neutral-50 hover:bg-neutral-100 rounded-2xl p-3.5 sm:p-4 border border-neutral-200 flex items-center gap-3 text-left transition-colors"
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">Výmena oleja & servis</span>
                    <span className="text-[11px] text-neutral-500 hidden sm:block">Rýchlo a bez čakania</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDirections}
                  className="bg-neutral-50 hover:bg-neutral-100 rounded-2xl p-3.5 sm:p-4 border border-neutral-200 flex items-center gap-3 text-left transition-colors"
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">Myslenická 3, Pezinok</span>
                    <span className="text-[11px] text-neutral-500 hidden sm:block">Bezplatné parkovanie</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* ONLINE REZERVAČNÝ BLOK (KOMPAKTNÝ, HUSTÝ, DOKONALE VYPLNENÝ) */}
          <section ref={bookingSectionRef} id="rezervacia" className="py-10 sm:py-16 bg-neutral-50/80 border-b border-neutral-100 px-4 sm:px-6 scroll-mt-20">
            <div className="max-w-6xl mx-auto">
              
              <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
                <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 bg-white">
                  Online rezervácia termínu
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight leading-tight">
                  Vyberte si službu a čas príchodu
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Vybavenie na presný čas bez čakania priamo v našej dielni na Myslenickej 3.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                
                {/* Ľavá strana: 3-KROKOVÝ REZERVAČNÝ FORMULÁR */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-xs">
                  
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-neutral-950">
                        {currentStep === 1 && 'Krok 1: Výber požadovanej služby'}
                        {currentStep === 2 && 'Krok 2: Výber dňa a času'}
                        {currentStep === 3 && 'Krok 3: Údaje zákazníka a vozidla'}
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        {currentStep === 1 && 'Kliknite na službu, o ktorú máte záujem'}
                        {currentStep === 2 && 'Zvoľte dostupný deň a konkrétnu hodinu'}
                        {currentStep === 3 && 'Vyplňte kontaktné údaje pre SMS potvrdenie'}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-full shrink-0">
                      {currentStep} / 3
                    </span>
                  </div>

                  {/* Vizuálny prepínač krokov */}
                  <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-neutral-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                        currentStep === 1
                          ? 'bg-white text-neutral-950 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      1. Služba
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedServiceId) setCurrentStep(2); }}
                      className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                        currentStep === 2
                          ? 'bg-white text-neutral-950 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      2. Termín
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedServiceId && selectedDate && selectedTime) setCurrentStep(3); }}
                      className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                        currentStep === 3
                          ? 'bg-white text-neutral-950 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      3. Údaje
                    </button>
                  </div>

                  {isSubmitted && confirmedBooking ? (
                    <div className="py-2">
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-100">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-neutral-900">Rezervácia bola zaevidovaná.</h4>
                          <p className="text-xs text-neutral-500">Potvrdzujúca SMS s termínom bola odoslaná na vaše číslo.</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 mb-5 text-xs bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Zvolená služba:</span>
                          <strong>{confirmedBooking.serviceName} ({confirmedBooking.servicePrice})</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Dohodnutý termín:</span>
                          <strong>{confirmedBooking.fullDateLabel} o {confirmedBooking.time}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">EČV a vozidlo:</span>
                          <strong>{confirmedBooking.licensePlate} · {confirmedBooking.carBrand}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Meno a telefón:</span>
                          <span>{confirmedBooking.fullName} · {confirmedBooking.phone}</span>
                        </div>
                      </div>

                      {/* Informácia o príchode pre zákazníka */}
                      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 mb-5 text-xs text-neutral-600 flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-neutral-900 mb-0.5">Tešíme sa na vašu návštevu v servise</p>
                          <p className="text-[11px] text-neutral-500 leading-relaxed">
                            Myslenická 3, Pezinok - Grinava. Parkovanie je priamo pred servisnou dielňou. Váš termín bol zaznamenaný v našom plánovacom kalendári servisu. V prípade akejkoľvek otázky volajte <a href="tel:0903301789" className="text-red-600 font-bold hover:underline">0903 301 789</a>.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="w-full sm:w-1/2 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
                        >
                          Nová rezervácia
                        </button>
                        <a
                          href="tel:0903301789"
                          className="w-full sm:w-1/2 py-3.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-red-600" />
                          <span>Zavolať do servisu</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Step 1: Services */}
                      {currentStep === 1 && (
                        <div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5" role="radiogroup" aria-labelledby={serviceSelectionRadioId}>
                            <span id={serviceSelectionRadioId} className="sr-only">Výber služby</span>
                            {SERVICES.slice(0, 4).map((s) => {
                              const isSelected = selectedServiceId === s.id;
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => setSelectedServiceId(s.id)}
                                  role="radio"
                                  aria-checked={isSelected}
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                      e.preventDefault();
                                      setSelectedServiceId(s.id);
                                    }
                                  }}
                                  className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-red-600 bg-red-50/40 ring-1 ring-red-600'
                                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                                        {s.category}
                                      </span>
                                      <span className="font-black text-sm text-neutral-950 tabular-nums whitespace-nowrap">
                                        {s.price}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-neutral-950 leading-snug">
                                      {s.name}
                                    </h4>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-neutral-400" />
                                      {s.duration}
                                    </span>
                                    <span className={`font-bold ${isSelected ? 'text-red-600' : 'text-neutral-400'}`}>
                                      {isSelected ? 'Vybrané ✓' : 'Zvoliť'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <span>Pokračovať na výber termínu</span>
                            <span>→</span>
                          </button>
                        </div>
                      )}

                      {/* Step 2: Date & Slot */}
                      {currentStep === 2 && (
                        <div>
                          <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">Zvolená služba:</span>
                            <span className="font-bold text-neutral-900">{selectedService.name} ({selectedService.price})</span>
                          </div>

                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Výber pracovného dňa:
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                            {availableDates.map((d) => (
                              <button
                                key={d.dateString}
                                type="button"
                                onClick={() => setSelectedDate(d.dateString)}
                                className={`p-2.5 rounded-xl text-center border text-xs transition-all ${
                                  selectedDate === d.dateString
                                    ? 'border-neutral-900 bg-neutral-900 text-white font-bold shadow-xs'
                                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                                }`}
                              >
                                <span className="block text-[10px] font-bold">{d.dayShort}</span>
                                <span className="tabular-nums text-xs">{d.formatted}</span>
                              </button>
                            ))}
                          </div>

                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                            Konkrétny časový slot:
                          </label>
                          <div className="grid grid-cols-3 gap-2 mb-5">
                            {TIME_SLOTS.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                  selectedTime === slot
                                    ? 'border-neutral-900 bg-neutral-900 text-white font-bold shadow-xs'
                                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
                                }`}
                              >
                                <span className="tabular-nums">{slot}</span>
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCurrentStep(1)}
                              className="w-1/3 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold"
                            >
                              Späť
                            </button>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(3)}
                              className="w-2/3 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                            >
                              Pokračovať na údaje →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Customer Details */}
                      {currentStep === 3 && (
                        <form onSubmit={handleSubmit} noValidate>
                          <div className="space-y-3 mb-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Meno a priezvisko *</label>
                                <input
                                  type="text"
                                  value={fullName}
                                  onChange={(e) => setFullName(e.target.value)}
                                  placeholder="Ján Novák"
                                  className="w-full px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:bg-white focus:outline-none"
                                />
                                {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Telefónne číslo *</label>
                                <input
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  placeholder="0903 123 456"
                                  className="w-full px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:bg-white focus:outline-none"
                                />
                                {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">EČV (ŠPZ) *</label>
                                <input
                                  type="text"
                                  value={licensePlate}
                                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                                  placeholder="PK 123AB"
                                  className="w-full px-3 py-2.5 text-xs font-mono uppercase bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:bg-white focus:outline-none"
                                />
                                {errors.licensePlate && <p className="text-[11px] text-red-600 mt-1">{errors.licensePlate}</p>}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Značka auta *</label>
                                <input
                                  type="text"
                                  value={carBrand}
                                  onChange={(e) => setCarBrand(e.target.value)}
                                  placeholder="Škoda Octavia"
                                  className="w-full px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:bg-white focus:outline-none"
                                />
                                {errors.carBrand && <p className="text-[11px] text-red-600 mt-1">{errors.carBrand}</p>}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-neutral-700 mb-1">
                                Poznámka k servisu <span className="text-neutral-400 font-normal">(nepovinné)</span>
                              </label>
                              <input
                                type="text"
                                value={customerNote}
                                onChange={(e) => setCustomerNote(e.target.value)}
                                placeholder="Napr. pneumatiky sú v kufri, skontrolovať aj geometriu..."
                                className="w-full px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:bg-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCurrentStep(2)}
                              className="w-1/3 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold"
                            >
                              Späť
                            </button>
                            <button
                              type="submit"
                              className="w-2/3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center justify-center gap-2"
                            >
                              <span>Potvrdiť rezerváciu termínu</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                </div>

                {/* Pravá strana: KOMPAKTNÉ ZHRNUTIE S GARANCIOU A KONTAKTOM */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Live karta rezervácie */}
                  <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 shadow-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 block mb-1">
                      Súhrn vybraného termínu
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-neutral-950 mb-3">
                      {selectedService.name}
                    </h4>

                    <div className="space-y-2 text-xs text-neutral-600 border-t border-b border-neutral-100 py-3 mb-4">
                      <div className="flex justify-between">
                        <span>Cena s DPH:</span>
                        <strong className="text-neutral-950 tabular-nums whitespace-nowrap">{selectedService.price}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Trvanie:</span>
                        <strong className="text-neutral-950">{selectedService.duration}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Termín:</span>
                        <strong className="text-neutral-950">{selectedDateObj?.fullLabel}, o {selectedTime}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Miesto:</span>
                        <span className="text-neutral-900 font-medium">Myslenická 3, Pezinok</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Garancia vybavenia na presný čas</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bezplatné parkovanie priamo pred servisom</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Okamžité SMS potvrdenie rezervácie</span>
                      </div>
                    </div>

                    <a
                      href="tel:0903301789"
                      className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Rýchle volanie: 0903 301 789</span>
                    </a>
                  </div>

                  {/* Malá infokarta lokality */}
                  <div className="bg-neutral-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Myslenická 3, Grinava</p>
                      <p className="text-[11px] text-neutral-400">902 03 Pezinok (hlavný ťah)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDirections}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Trasa</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </section>

          {/* SLUŽBY S REÁLNYMI FOTOGRAFIAMI (KOMPAKTNÁ MRIEŽKA) */}
          <section className="py-10 sm:py-16 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
                <div>
                  <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5 bg-white">
                    Portfólio prác
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
                    Kompletné služby servisu a pneuservisu
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToTab('services')}
                  className="font-bold text-xs uppercase tracking-wider text-red-600 hover:text-red-700"
                >
                  Zobraziť všetky služby a detaily →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SERVICES.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-neutral-400 transition-colors"
                  >
                    <div className="h-40 w-full overflow-hidden bg-neutral-100 relative">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        fallback={
                          <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-300">
                            {item.name}
                          </div>
                        }
                      />
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-neutral-900/80 px-2.5 py-1 rounded-full backdrop-blur-xs">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-neutral-950">{item.name}</h3>
                          <span className="text-xs sm:text-sm font-black text-neutral-950 tabular-nums shrink-0 ml-2 whitespace-nowrap">
                            {item.price}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed mb-3">{item.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollToBooking(item.id)}
                        className="font-bold text-xs uppercase tracking-wider text-red-600 hover:text-red-700 text-left pt-2.5 border-t border-neutral-100 flex items-center gap-1"
                      >
                        <span>Rezervovať službu</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>

          {/* O NÁS / HODNOTENIA / BENTO BLOK */}
          <section className="py-10 sm:py-16 bg-neutral-50/70 border-y border-neutral-100 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              
              <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
                <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5 bg-white">
                  O našom servise
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight leading-tight">
                  Zverte vaše auto odborníkom v <span className="text-red-600">Auto Life Plus</span>.
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* Ľavá časť Bento */}
                <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                  
                  {/* Testimonial s reálnou fotkou zákazníka */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col justify-between">
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed italic mb-4">
                      "Do Auto Life Plus chodím na prezutie a servis už tretiu sezónu. Oceňujem férový prístup, dodržanie dohodnutého času na minútu a transparentné ceny bez nepríjemných prekvapení. Jednoznačne najspoľahlivejší servis v Pezinku."
                    </p>
                    
                    <div className="pt-3 border-t border-neutral-100 flex items-center gap-3">
                      <SafeImage
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                        alt="Peter Kováč"
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                        fallback={<div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">PK</div>}
                      />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Peter Kováč</h4>
                        <p className="text-[11px] text-neutral-400">Pravidelný zákazník · Pezinok</p>
                      </div>
                      <div className="ml-auto flex items-center gap-0.5">
                        <StarIcon />
                        <StarIcon />
                        <StarIcon />
                        <StarIcon />
                        <StarIcon />
                      </div>
                    </div>
                  </div>

                  {/* 2 Štatistické bloky */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-neutral-950 block tabular-nums">15+</span>
                        <span className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5 block">Rokov praxe</span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="bg-neutral-900 text-white rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-2xl sm:text-3xl font-black text-white block tabular-nums">4.7</span>
                        <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider mt-0.5 block">Google Recenzie</span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 text-red-500 flex items-center justify-center font-bold shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Pravá časť Bento */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                      Technické vybavenie
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-neutral-950 mb-3">
                      Moderná dielňa s kalibrovaným vybavením
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                      V Auto Life Plus investujeme do certifikovaných technológií. Naša 3D laserová geometria John Bean a vyvažovačky Hofmann zabezpečujú presnosť na desatinu milimetra.
                    </p>
                    <div className="space-y-2 text-xs text-neutral-700">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Laserové 3D meranie John Bean</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Presné nemecké momentové doťahovanie</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Multiznačková počítačová diagnostika</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Myslenická 3, Pezinok</span>
                    <button
                      type="button"
                      onClick={handleDirections}
                      className="text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      Zobraziť trasu →
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* FAQ & 100% GARANCIA SPOKOJNOSTI */}
          <section className="py-10 sm:py-16 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              
              <div className="lg:col-span-5 space-y-3">
                <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block bg-white">
                  Časté otázky
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-950">Prečo motoristi volia Auto Life Plus?</h3>
                
                <div className="bg-neutral-900 text-white rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">100% Garancia spokojnosti</h4>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Každé auto pred odovzdaním kontrolujeme a doťahujeme momentovým kľúčom na predpísanú hodnotu výrobcu.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200 p-4 sm:p-6 shadow-xs">
                <div className="divide-y divide-neutral-100">
                  {FAQS.map((faq) => (
                    <div key={faq.id} className="py-3 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                        className="w-full text-left flex items-center justify-between gap-4 py-1"
                      >
                        <span className="font-bold text-xs sm:text-sm text-neutral-950">{faq.question}</span>
                        <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {openFaqId === faq.id ? '−' : '+'}
                        </span>
                      </button>
                      {openFaqId === faq.id && (
                        <p className="text-xs text-neutral-600 leading-relaxed mt-2">{faq.answer}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

        </main>
      )}

      {/* SUBPAGE 2: SLUŽBY */}
      {currentTab === 'services' && (
        <main className="flex-1 pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 bg-white">
                Podstránka · Služby
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-neutral-950 uppercase tracking-tight">
                Servisné práce a úkony
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Pozrite si detailný rozpis prác, ktoré pre vaše vozidlo zabezpečujeme v Pezinku.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs flex flex-col justify-between">
                  <div className="h-40 w-full overflow-hidden bg-neutral-100 relative">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      fallback={
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-300">
                          {item.name}
                        </div>
                      }
                    />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-neutral-900/80 px-2.5 py-1 rounded-full backdrop-blur-xs">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-black text-neutral-950 tabular-nums whitespace-nowrap">{item.price}</span>
                        <span className="text-xs text-neutral-400">Čas: {item.duration}</span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-950 mb-2">{item.name}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">{item.description}</p>
                      
                      <div className="space-y-1.5 pt-3 border-t border-neutral-100 mb-5 text-xs text-neutral-600">
                        {item.details.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => scrollToBooking(item.id)}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-center text-xs uppercase"
                      >
                        Rezervovať termín
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      )}

      {/* SUBPAGE 3: CENNÍK */}
      {currentTab === 'pricing' && (
        <main className="flex-1 pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 bg-white">
                Podstránka · Cenník
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-neutral-950 uppercase tracking-tight">
                Cenník autoservisu
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Prehľadné a konečné ceny s DPH za prácu mechanika. Žiadne skryté poplatky.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 sm:px-6 font-bold">Úkon</th>
                    <th className="py-3 px-4 font-bold hidden sm:table-cell">Kategória</th>
                    <th className="py-3 px-4 font-bold hidden sm:table-cell">Odhadovaný čas</th>
                    <th className="py-3 px-4 font-bold text-right">Cena s DPH</th>
                    <th className="py-3 px-4 sm:px-6 font-bold text-right">Rezervácia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {SERVICES.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 sm:px-6">
                        <span className="font-bold text-neutral-950 block">{s.name}</span>
                        <span className="text-xs text-neutral-400 mt-0.5 block">{s.description}</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-red-600 hidden sm:table-cell">{s.category}</td>
                      <td className="py-3 px-4 tabular-nums text-neutral-500 hidden sm:table-cell">{s.duration}</td>
                      <td className="py-3 px-4 text-right font-black text-neutral-950 tabular-nums whitespace-nowrap">{s.price}</td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={() => scrollToBooking(s.id)}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl"
                        >
                          Zvoliť
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </main>
      )}

      {/* SUBPAGE 4: O NÁS */}
      {currentTab === 'about' && (
        <main className="flex-1 pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
            
            <div className="text-center max-w-2xl mx-auto">
              <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 bg-white">
                Podstránka · O servise
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-neutral-950 uppercase tracking-tight">
                Autoservis Auto Life Plus
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Tradícia, profesionalita a moderné technické zázemie na Myslenickej 3 v Pezinku.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-center">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-950 mb-3">Naša filozofia a prístup</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-3">
                  Sme lokálny autoservis v Grinave (Pezinok). Veríme v priamu a otvorenú komunikáciu so zákazníkom. Pred každým úkonom vám vysvetlíme, prečo je oprava potrebná a koľko bude stáť.
                </p>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Používame najnovšiu 3D laserovú geometriu náprav John Bean, vyvažovačky kolies Hofmann a diagnostiku, aby vaše vozidlo spĺňalo najvyššie nároky na bezpečnosť.
                </p>
              </div>

              <div className="bg-neutral-900 text-white rounded-3xl p-6 border border-neutral-800 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Záruka a garancia</span>
                <h4 className="text-lg font-bold">100% férový servis v Pezinku</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Zákazník u nás vždy vie, za čo platí. Dodržiavame dohodnuté termíny a pred výmenou akéhokoľvek dielu s vami vopred skonzultujeme cenu.
                </p>
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Myslenická 3, Pezinok</span>
                  <a href="tel:0903301789" className="text-red-400 font-bold hover:underline">0903 301 789</a>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* SUBPAGE 5: KONTAKT */}
      {currentTab === 'contact' && (
        <main className="flex-1 pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2 bg-white">
                Podstránka · Kontakt
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-neutral-950 uppercase tracking-tight">
                Kde nás nájdete
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2">
                Dielňa sa nachádza priamo na hlavnom ťahu smerom z Bratislavy do Pezinka.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-950 mb-4">Kontaktné údaje</h3>
                  <div className="space-y-3.5 text-xs text-neutral-700">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Myslenická 3, Grinava</strong>
                        <p className="text-neutral-500">902 03 Pezinok, Slovensko</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>0903 301 789</strong>
                        <p className="text-neutral-500">Priamy kontakt na vedúceho diele</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Otváracie hodiny</strong>
                        <p>Po – Pia: 08:00 – 17:00</p>
                        <p>Sobota: 08:00 – 12:00</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleDirections}
                    className="w-full sm:w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition-colors"
                  >
                    Navigovať
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    className="w-full sm:w-1/2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase rounded-xl transition-colors"
                  >
                    Uložiť vizitku
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-neutral-900 text-white p-6 rounded-3xl border border-neutral-800 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Priamy prístup z cesty II/502</span>
                  <h4 className="font-bold text-base text-white">Parkovanie priamo pred servisnou bránou</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Pri príchode do Pezinka z Bratislavy / Svätého Jura odbočte v Grinave na Myslenickú 3. Pred dielňou máme vyhradené bezplatné parkovacie miesta.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDirections}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Spustiť Google Mapy</span>
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 text-xs text-neutral-600">
                  <h4 className="font-bold text-neutral-950 mb-1">Rýchle vybavenie</h4>
                  <p>Prezutie pneumatík a bežné úkony vybavujeme do 30 až 40 minút na dohodnutý čas.</p>
                </div>
              </div>

            </div>

          </div>
        </main>
      )}

      {/* SUBPAGE 6: DEDIKOVANÁ REZERVÁCIA (AK ZVOLENÁ Z NAVIGÁCIE) */}
      {currentTab === 'booking' && (
        <main className="flex-1 pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            
            <div className="mb-6 text-center">
              <span className="border border-red-200 text-red-600 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5 bg-white">
                Rezervačný systém
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 uppercase tracking-tight">
                Online rezervácia termínu
              </h1>
              <p className="text-xs text-neutral-600 mt-1">
                Zvoľte službu, dátum a čas príchodu do servisu Auto Life Plus.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-7 shadow-xs">
              {isSubmitted && confirmedBooking ? (
                <div className="py-2">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-neutral-900">Rezervácia bola zaevidovaná.</h4>
                      <p className="text-xs text-neutral-500">Potvrdzujúca SMS s termínom bola odoslaná na vaše číslo.</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5 text-xs bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <p><span className="text-neutral-500">Služba:</span> <strong>{confirmedBooking.serviceName}</strong> ({confirmedBooking.servicePrice})</p>
                    <p><span className="text-neutral-500">Termín:</span> <strong>{confirmedBooking.fullDateLabel} o {confirmedBooking.time}</strong></p>
                    <p><span className="text-neutral-500">EČV:</span> <strong>{confirmedBooking.licensePlate}</strong> · {confirmedBooking.carBrand}</p>
                    <p><span className="text-neutral-500">Meno:</span> <strong>{confirmedBooking.fullName}</strong> ({confirmedBooking.phone})</p>
                  </div>

                  {/* Informácia o príchode pre zákazníka */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 mb-5 text-xs text-neutral-600 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-neutral-900 mb-0.5">Tešíme sa na vašu návštevu v servise</p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Myslenická 3, Pezinok - Grinava. Parkovanie je vyhradené priamo pred servisnou dielňou. Váš termín bol zaznamenaný v našom plánovacom kalendári servisu. V prípade akejkoľvek otázky volajte <a href="tel:0903301789" className="text-red-600 font-bold hover:underline">0903 301 789</a>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-1/2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase rounded-xl transition-colors text-center"
                    >
                      Nová rezervácia
                    </button>
                    <a
                      href="tel:0903301789"
                      className="w-full sm:w-1/2 py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold text-xs uppercase rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-red-600" />
                      <span>Zavolať do servisu</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-neutral-100 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className={`py-2 rounded-lg text-center ${currentStep === 1 ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}
                    >
                      1. Služba
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedServiceId) setCurrentStep(2); }}
                      className={`py-2 rounded-lg text-center ${currentStep === 2 ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}
                    >
                      2. Termín
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedServiceId && selectedDate && selectedTime) setCurrentStep(3); }}
                      className={`py-2 rounded-lg text-center ${currentStep === 3 ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}
                    >
                      3. Údaje
                    </button>
                  </div>

                  {currentStep === 1 && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                        {SERVICES.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedServiceId(s.id)}
                            className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between ${
                              selectedServiceId === s.id ? 'border-red-600 bg-red-50/40 ring-1 ring-red-600' : 'border-neutral-200 bg-white hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-bold uppercase text-red-600">{s.category}</span>
                              <span className="font-bold text-xs text-neutral-900 whitespace-nowrap">{s.price}</span>
                            </div>
                            <h4 className="text-xs font-bold text-neutral-900">{s.name}</h4>
                            <span className="text-[11px] text-neutral-500 mt-2 block">{s.duration}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl"
                      >
                        Pokračovať na výber dňa →
                      </button>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-bold uppercase tracking-wider">Vyberte pracovný deň:</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                        {availableDates.map((d) => (
                          <button
                            key={d.dateString}
                            type="button"
                            onClick={() => setSelectedDate(d.dateString)}
                            className={`p-2 rounded-xl text-center border text-xs ${
                              selectedDate === d.dateString ? 'border-neutral-900 bg-neutral-900 text-white font-bold' : 'border-neutral-200 bg-white'
                            }`}
                          >
                            <span className="block font-bold text-[10px]">{d.dayShort}</span>
                            <span className="text-xs">{d.formatted}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-500 mb-2 font-bold uppercase tracking-wider">Časový slot:</p>
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                              selectedTime === slot ? 'border-neutral-900 bg-neutral-900 text-white font-bold' : 'border-neutral-200 bg-white'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="w-1/3 py-3 border border-neutral-200 rounded-xl text-xs font-bold"
                        >
                          Späť
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="w-2/3 py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold uppercase"
                        >
                          Pokračovať na údaje →
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <form onSubmit={handleSubmit} noValidate>
                      <div className="space-y-3 mb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-bold mb-1">Meno a priezvisko *</label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Martin Horváth"
                              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:outline-none"
                            />
                            {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1">Telefónne číslo *</label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="0903 123 456"
                              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:outline-none"
                            />
                            {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-bold mb-1">EČV (ŠPZ) *</label>
                            <input
                              type="text"
                              value={licensePlate}
                              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                              placeholder="PK 123AB"
                              className="w-full px-3 py-2 text-xs font-mono uppercase bg-neutral-50 border border-neutral-200 rounded-xl focus:border-red-600 focus:outline-none"
                            />
                            {errors.licensePlate && <p className="text-[11px] text-red-600 mt-1">{errors.licensePlate}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1">Značka auta *</label>
                            <input
                              type="text"
                              value={carBrand}
                              onChange={(e) => setCarBrand(e.target.value)}
                              placeholder="Škoda Octavia"
                              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:border-red-600 focus:outline-none"
                            />
                            {errors.carBrand && <p className="text-[11px] text-red-600 mt-1">{errors.carBrand}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1">
                              Poznámka k servisu <span className="text-neutral-400 font-normal">(nepovinné)</span>
                            </label>
                            <input
                              type="text"
                              value={customerNote}
                              onChange={(e) => setCustomerNote(e.target.value)}
                              placeholder="Napr. pneumatiky sú v kufri..."
                              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:border-red-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="w-1/3 py-3 border border-neutral-200 rounded-xl text-xs font-bold"
                        >
                          Späť
                        </button>
                        <button
                          type="submit"
                          className="w-2/3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                        >
                          Potvrdiť rezerváciu
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

          </div>
        </main>
      )}

      {/* 2. SPODNÁ LIŠTA (FOOTER BEZ LOGA S VODOTLAČOVÝM NÁPISOM) */}
      <footer className="w-full bg-neutral-950 text-white pt-10 sm:pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="pb-8 border-b border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Potrebujete termín v servise? Sme tu pre vás.
              </h3>
              <p className="text-xs text-neutral-400 mt-1">Myslenická 3, Pezinok - Grinava · Po - Pia: 08:00 - 17:00</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <a
                href="tel:0903301789"
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl text-center"
              >
                0903 301 789
              </a>
              <button
                type="button"
                onClick={() => scrollToBooking()}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center shadow-md"
              >
                Rezervovať termín
              </button>
            </div>
          </div>

          <div className="py-8 border-b border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            
            {/* O servise */}
            <div className="space-y-2">
              <span className="font-black text-base tracking-tight text-white uppercase block">
                Auto Life Plus
              </span>
              <p className="text-neutral-400 leading-relaxed">
                Váš spoľahlivý partner pre servis vozidiel, 3D laserovú geometriu náprav a pneuservis v Pezinku (Grinava).
              </p>
              <p className="text-neutral-500 font-mono text-[11px]">
                IČO: 46 821 349 · DIČ: 2023594821
              </p>
            </div>

            {/* Služby */}
            <div className="space-y-2">
              <span className="font-bold text-white uppercase tracking-wider block mb-1">
                Navigácia
              </span>
              <button onClick={() => navigateToTab('home')} className="text-neutral-400 hover:text-white block text-left">Domov</button>
              <button onClick={() => navigateToTab('services')} className="text-neutral-400 hover:text-white block text-left">Služby</button>
              <button onClick={() => navigateToTab('pricing')} className="text-neutral-400 hover:text-white block text-left">Cenník</button>
              <button onClick={() => navigateToTab('about')} className="text-neutral-400 hover:text-white block text-left">O servise</button>
              <button onClick={() => navigateToTab('contact')} className="text-neutral-400 hover:text-white block text-left">Kontakt</button>
            </div>

            {/* Otváracie hodiny */}
            <div className="space-y-1">
              <span className="font-bold text-white uppercase tracking-wider block mb-1">
                Otváracie hodiny
              </span>
              <p className="text-neutral-300 font-semibold">Pondelok – Piatok:</p>
              <p className="text-neutral-400">08:00 – 17:00</p>
              <p className="text-neutral-300 font-semibold mt-1">Sobota:</p>
              <p className="text-neutral-400">08:00 – 12:00</p>
              <p className="text-neutral-500">Nedeľa: Zatvorené</p>
            </div>

            {/* Kontakt & Lokalita */}
            <div className="space-y-1">
              <span className="font-bold text-white uppercase tracking-wider block mb-1">
                Dielňa v Pezinku
              </span>
              <p className="text-neutral-300 font-bold">Myslenická 3, Grinava</p>
              <p className="text-neutral-400">902 03 Pezinok, Slovensko</p>
              <p className="text-red-400 font-bold mt-1">Tel: 0903 301 789</p>
              <p className="text-neutral-400">Google: 4.7 / 5 (12 recenzií)</p>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2">
            <p>© {new Date().getFullYear()} Autoservis Auto Life Plus. Všetky práva vyhradené.</p>
            <div className="flex items-center gap-3">
              <p>Myslenická 3, Pezinok - Grinava</p>
              <span className="text-neutral-700">·</span>
              <button
                type="button"
                onClick={() => setIsOwnerAdminOpen(true)}
                className="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800"
                title={`Otvoriť správu rezervácií servisu pre ${OWNER_CALENDAR_EMAIL}`}
              >
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                <span>Správa servisu ({OWNER_CALENDAR_EMAIL})</span>
                {ownerUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Google účet pripojený"></span>}
              </button>
            </div>
          </div>

          <div className="pt-4 overflow-hidden select-none pointer-events-none opacity-10 text-center">
            <span className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter text-white whitespace-nowrap block">
              AUTO LIFE PLUS
            </span>
          </div>

        </div>
      </footer>

      {/* OWNER ADMIN & GOOGLE CALENDAR MODAL */}
      <OwnerAdminModal
        isOpen={isOwnerAdminOpen}
        onClose={() => setIsOwnerAdminOpen(false)}
        ownerUser={ownerUser}
        onSignIn={handleOwnerLogin}
        onSignOut={handleOwnerLogout}
        isLoggingIn={isLoggingIn}
        bookings={allBookings}
        onUpdateBooking={handleUpdateBooking}
        onAddTestBooking={handleAddTestBooking}
        accessToken={ownerAccessToken}
      />

    </div>
  );
}
