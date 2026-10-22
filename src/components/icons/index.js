import { createElement } from 'react';
import { BrandIcon } from './BrandIcons';

/*
 * Iconos de la app con la misma API que usaban los componentes (size, className, aria-hidden),
 * dibujados con la iconografía propia de SmartDental (BrandIcons.jsx).
 */
const make = (name) => {
  const Icon = ({ size = 20, strokeWidth, ...rest }) => createElement(BrandIcon, { name, size, ...rest });
  Icon.displayName = `Icon(${name})`;
  return Icon;
};

export const AlertTriangle = make('alert');
export const ArrowLeft = make('arrowLeft');
export const ArrowRight = make('arrow');
export const ArrowUpRight = make('arrowUpRight');
export const BadgeCheck = make('checkCircle');
export const Building2 = make('clinic');
export const CalendarClock = make('clock');
export const CalendarDays = make('agenda');
export const CalendarRange = make('calendarRange');
export const Check = make('check');
export const CheckCircle2 = make('checkCircle');
export const ChevronDown = make('chevronDown');
export const ChevronLeft = make('chevronLeft');
export const ChevronRight = make('chevronRight');
export const CircleCheck = make('checkCircle');
export const CirclePause = make('pauseCircle');
export const Clock = make('clock');
export const Coins = make('plans');
export const Crown = make('crown');
export const DatabaseBackup = make('download');
export const Eye = make('eye');
export const EyeOff = make('eyeOff');
export const FileText = make('audit');
export const ImageOff = make('imageOff');
export const Inbox = make('inbox');
export const KeyRound = make('key');
export const Layers3 = make('layers');
export const LayoutGrid = make('layout');
export const Lock = make('lock');
export const LockKeyhole = make('lock');
export const LogIn = make('login');
export const LogOut = make('logout');
export const Mail = make('mail');
export const MapPin = make('pin');
export const Menu = make('menu');
export const MessageCircle = make('whatsapp');
export const Minus = make('minus');
export const Moon = make('moon');
export const Move3d = make('rotate3d');
export const Package = make('inventory');
export const Pause = make('pause');
export const Pencil = make('edit');
export const Phone = make('phone');
export const Play = make('play');
export const Plus = make('plus');
export const ReceiptText = make('receipt');
export const RefreshCw = make('refresh');
export const ScrollText = make('audit');
export const Search = make('search');
export const Settings2 = make('preferences');
export const ShieldCheck = make('shield');
export const Sparkles = make('sparkles');
export const Sun = make('sun');
export const Trash2 = make('trash');
export const UserRoundCog = make('team');
export const Users = make('patients');
export const UsersRound = make('team');
export const Wallet = make('wallet');
export const WifiOff = make('wifiOff');
export const X = make('close');
