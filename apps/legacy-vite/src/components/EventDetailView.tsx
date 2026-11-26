import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  MapPin,
  MessageSquare,
  Pin,
  Plus,
  Send,
  Share2,
  ShieldAlert,
  UserCheck,
  UserX,
  Utensils,
  Vote,
} from 'lucide-react';
import {
  GatheringEvent,
  MezeContribution,
  MezeStatus,
  RSVPStatus,
  UserProfile,
} from '../types/app';
import {
  CHAT_STICKERS,
  HUMOROUS_EXCUSES,
  HUMOROUS_ROLES,
  SEASONAL_THEMES,
} from '../data/bulgaria';

interface EventDetailViewProps {
  event: GatheringEvent;
  profile: UserProfile;
  onBack: () => void;
  onSetRSVP: (
    eventId: string,
    status: RSVPStatus,
    options?: { excuse?: string; lateMinutes?: number; nonAlcoholic?: boolean }
  ) => void;
  onApproveAttendee: (eventId: string, userId: string, approve: boolean) => void;
  onChangeVenue: (eventId: string, newVenueName: string, newAddress: string) => void;
  onCancelEvent: (eventId: string) => void;
  onSendMessage: (
    eventId: string,
    text: string,
    opts?: { sticker?: string; shareLocation?: boolean }
  ) => void;
  onToggleReaction: (eventId: string, messageId: string, emoji: string) => void;
  onTogglePinMessage: (eventId: string, messageId: string) => void;
  onVotePoll: (eventId: string, pollId: string, optionId: string) => void;
  onAddPoll: (eventId: string, question: string, options: string[]) => void;
  onCycleContribution: (eventId: string, contributionId: string, nextStatus: MezeStatus) => void;
  onAddContribution: (
    eventId: string,
    item: string,
    category: MezeContribution['category']
  ) => void;
  onReportTarget: (
    targetType: 'event' | 'user',
    targetId: string,
    targetName: string,
    reason: string
  ) => void;
  onBlockUser: (userId: string, nickname: string) => void;
  onShowToast: (msg: string) => void;
}

type DetailSection = 'details' | 'chat' | 'polls' | 'meze';

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  profile,
  onBack,
  onSetRSVP,
  onApproveAttendee,
  onChangeVenue,
  onCancelEvent,
  onSendMessage,
  onToggleReaction,
  onTogglePinMessage,
  onVotePoll,
  onAddPoll,
  onCycleContribution,
  onAddContribution,
  onReportTarget,
  onBlockUser,
  onShowToast,
}) => {
  const [section, setSection] = useState<DetailSection>('details');
  const [showExcusePicker, setShowExcusePicker] = useState(false);
  const [customExcuse, setCustomExcuse] = useState('');
  const [showVenueEdit, setShowVenueEdit] = useState(false);
  const [editVenueName, setEditVenueName] = useState(event.venueName);
  const [editAddress, setEditAddress] = useState(event.exactAddress);
  const [showReportModal, setShowReportModal] = useState<{
    type: 'event' | 'user';
    id: string;
    name: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Неподходящо съдържание или спам');

  // Chat state
  const [chatText, setChatText] = useState('');
  const [showStickers, setShowStickers] = useState(false);

  // Poll creation state
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');
  const [pollOpt3, setPollOpt3] = useState('');

  // Meze creation state
  const [newMezeItem, setNewMezeItem] = useState('');
  const [newMezeCategory, setNewMezeCategory] = useState<MezeContribution['category']>('мезе');

  const myEntry = event.attendees.find((a) => a.userId === profile.id);
  const isOrganizer = event.organizerId === profile.id;
  const isApproved = isOrganizer || myEntry?.status === 'confirmed';
  const canAccessPrivateContent = !event.manualApproval || isApproved;

  const confirmedAttendees = useMemo(
    () => event.attendees.filter((a) => a.status === 'confirmed'),
    [event.attendees]
  );
  const pendingAttendees = useMemo(
    () => event.attendees.filter((a) => a.status === 'pending_approval'),
    [event.attendees]
  );
  const maybeAttendees = useMemo(
    () => event.attendees.filter((a) => a.status === 'maybe'),
    [event.attendees]
  );
  const declinedAttendees = useMemo(
    () => event.attendees.filter((a) => a.status === 'declined'),
    [event.attendees]
  );

  const freeSeats = Math.max(0, event.maxAttendees - confirmedAttendees.length);
  const hasQuorum = confirmedAttendees.length >= 3 && !event.isCancelled;

  const missingSalad = useMemo(
    () => event.contributions.some((c) => c.category === 'салата' && c.status === 'free'),
    [event.contributions]
  );

  const pinnedMessages = useMemo(
    () => event.messages.filter((m) => m.isPinned),
    [event.messages]
  );

  const copyInviteLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?invite=${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      onShowToast('Линкът за покана е копиран. Прати го на дружината!');
    } catch {
      onShowToast(`Покана: ${url}`);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendMessage(event.id, chatText);
    setChatText('');
  };

  const handlePollCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPoll(event.id, pollQuestion, [pollOpt1, pollOpt2, pollOpt3]);
    setPollQuestion('');
    setPollOpt1('');
    setPollOpt2('');
    setPollOpt3('');
    setShowNewPoll(false);
  };

  const handleAddMeze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMezeItem.trim()) return;
    onAddContribution(event.id, newMezeItem, newMezeCategory);
    setNewMezeItem('');
  };

  const themeInfo = SEASONAL_THEMES[event.seasonalTheme];

  return (
    <div className="space-y-6">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5D5348] hover:text-[#1E1915] min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Назад към сбирките</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyInviteLink}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3.5 py-2 text-xs font-semibold text-[#1E1915] hover:bg-[#EFE8DC] min-h-[40px] whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5 text-[#1C4532]" />
            <span>Покани с линк</span>
          </button>

          {!isOrganizer && (
            <button
              type="button"
              onClick={() =>
                setShowReportModal({ type: 'event', id: event.id, name: event.title })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-2 text-xs font-medium text-[#5D5348] hover:text-[#7C232B] min-h-[40px]"
              aria-label="Докладвай сбирката"
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Докладвай</span>
            </button>
          )}
        </div>
      </div>

      {/* Event Header Card */}
      <section className="overflow-hidden rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7]">
        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-5 relative min-h-[210px] bg-[#EFE8DC]">
            <img
              src={event.coverImage}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover lg:h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1915]/70 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[#F7F3EC]">
              <span className="text-xs font-medium">{themeInfo.name}</span>
              {event.isCancelled ? (
                <span className="tavern-stamp bg-[#FDFBF7]/95 text-[#7C232B]">ОТМЕНЕНО</span>
              ) : hasQuorum ? (
                <span className="tavern-stamp bg-[#FDFBF7]/95 text-[#1C4532]">КВОРУМ</span>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#5D5348]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#1E1915]">
                  <MapPin className="h-3.5 w-3.5 text-[#7C232B]" />
                  {event.city}, {event.neighborhood}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Calendar className="h-3.5 w-3.5" />
                  {event.dateLabel}, {event.time} ч.
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{event.venueType}</span>
                {event.isPrivate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#7C232B] font-medium">
                      <Lock className="h-3 w-3" />
                      Частна сбирка
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold text-[#1E1915] text-balance">
                {event.title}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-[#5D5348]">
                {event.description}
              </p>

              {/* Seat count & last chair microinteraction */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#DDD3C2]/80 pt-4 text-sm">
                <span className="font-mono font-semibold text-[#1E1915] tabular-nums">
                  {confirmedAttendees.length}/{event.maxAttendees} заети стола
                </span>
                {!event.isCancelled && freeSeats === 1 && (
                  <span className="font-semibold text-[#7C232B]">
                    Остана един стол. Историята чака.
                  </span>
                )}
                {!event.isCancelled && freeSeats === 0 && (
                  <span className="font-semibold text-[#7C232B]">
                    Масата е пълна (можеш да натиснеш „Ще видим“).
                  </span>
                )}
                {event.nonAlcoholicFriendly && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#1C4532] font-medium">
                    <Car className="h-3.5 w-3.5" />
                    Безалкохолно участие добре дошло
                  </span>
                )}
              </div>
            </div>

            {/* RSVP Controls („Ще дойда, ама...“) */}
            {!event.isCancelled && (
              <div className="mt-5 space-y-3 border-t border-[#DDD3C2]/80 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcusePicker(false);
                      onSetRSVP(event.id, 'confirmed');
                    }}
                    disabled={freeSeats === 0 && myEntry?.status !== 'confirmed'}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                      myEntry?.status === 'confirmed'
                        ? 'bg-[#1C4532] text-[#F7F3EC]'
                        : myEntry?.status === 'pending_approval'
                        ? 'bg-[#A6762C] text-[#FDFBF7]'
                        : 'bg-[#1C4532] text-[#F7F3EC] hover:bg-[#153526] disabled:opacity-40'
                    }`}
                  >
                    {myEntry?.status === 'confirmed'
                      ? 'Идвам! (Потвърдено ✓)'
                      : myEntry?.status === 'pending_approval'
                      ? 'Заявката чака одобрение'
                      : event.manualApproval
                      ? 'Заяви участие'
                      : 'Идвам!'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExcusePicker(false);
                      onSetRSVP(event.id, 'maybe');
                    }}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                      myEntry?.status === 'maybe'
                        ? 'border-[#1E1915] bg-[#EFE8DC] text-[#1E1915]'
                        : 'border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#1E1915]'
                    }`}
                  >
                    Ще видим
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExcusePicker((s) => !s)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                      myEntry?.status === 'declined'
                        ? 'border-[#7C232B] bg-[#7C232B]/10 text-[#7C232B]'
                        : 'border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#7C232B]'
                    }`}
                  >
                    Този път ме няма
                  </button>
                </div>

                {/* Secondary quick actions when confirmed: late 15 min / non-alcoholic driver */}
                {myEntry?.status === 'confirmed' && (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onSetRSVP(event.id, 'confirmed', {
                          lateMinutes: myEntry.lateMinutes ? undefined : 15,
                          nonAlcoholic: myEntry.nonAlcoholic,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors min-h-[36px] ${
                        myEntry.lateMinutes
                          ? 'border-[#A6762C] bg-[#A6762C]/15 text-[#7A5218]'
                          : 'border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#1E1915]'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {myEntry.lateMinutes ? 'Закъснявам с 15 мин ✓' : 'Закъснявам с 15 мин'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSetRSVP(event.id, 'confirmed', {
                          lateMinutes: myEntry.lateMinutes,
                          nonAlcoholic: !myEntry.nonAlcoholic,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors min-h-[36px] ${
                        myEntry.nonAlcoholic
                          ? 'border-[#1C4532] bg-[#1C4532]/10 text-[#1C4532]'
                          : 'border-[#DDD3C2] bg-[#F7F3EC] text-[#5D5348] hover:text-[#1E1915]'
                      }`}
                    >
                      <Car className="h-3.5 w-3.5" />
                      <span>
                        {myEntry.nonAlcoholic
                          ? 'На безалкохолно / шофьор ✓'
                          : 'Избирам безалкохолно'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Humorous Excuse Picker */}
                {showExcusePicker && (
                  <div className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#1E1915]">
                      Избери официално оправдание пред дружината:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {HUMOROUS_EXCUSES.map((excuse) => (
                        <button
                          key={excuse}
                          type="button"
                          onClick={() => {
                            onSetRSVP(event.id, 'declined', { excuse });
                            setShowExcusePicker(false);
                          }}
                          className="rounded-lg border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-2 text-xs text-[#1E1915] hover:border-[#7C232B] hover:text-[#7C232B] text-left transition-colors"
                        >
                          {excuse}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customExcuse}
                        onChange={(e) => setCustomExcuse(e.target.value)}
                        placeholder="Или напиши своя причина..."
                        className="flex-1 rounded-lg border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-2 text-xs text-[#1E1915]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onSetRSVP(event.id, 'declined', {
                            excuse: customExcuse.trim() || HUMOROUS_EXCUSES[4],
                          });
                          setCustomExcuse('');
                          setShowExcusePicker(false);
                        }}
                        className="rounded-lg bg-[#7C232B] px-3.5 py-2 text-xs font-semibold text-[#F7F3EC]"
                      >
                        Откажи
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Workspace Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#EFE8DC] p-1">
        {[
          { id: 'details' as const, label: 'Детайли и участници', icon: <UserCheck className="h-4 w-4" /> },
          {
            id: 'chat' as const,
            label: `Казанът къкри (${event.messages.length})`,
            icon: <MessageSquare className="h-4 w-4" />,
          },
          {
            id: 'polls' as const,
            label: `Съдът на мезето (${event.polls.length})`,
            icon: <Vote className="h-4 w-4" />,
          },
          {
            id: 'meze' as const,
            label: `Кой какво носи? (${event.contributions.length})`,
            icon: <Utensils className="h-4 w-4" />,
          },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
              section === t.id
                ? 'bg-[#FDFBF7] text-[#1E1915] shadow-xs'
                : 'text-[#5D5348] hover:text-[#1E1915]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Details & Attendees */}
      {section === 'details' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            {/* Address & Privacy Lock Card */}
            <div className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#1E1915]">
                  Място и точен адрес
                </h2>
                {isOrganizer && !event.isCancelled && (
                  <button
                    type="button"
                    onClick={() => setShowVenueEdit((v) => !v)}
                    className="text-xs font-semibold text-[#1C4532] hover:underline"
                  >
                    Смени мястото
                  </button>
                )}
              </div>

              <p className="mt-2 text-sm font-semibold text-[#1E1915]">
                {event.venueName} — {event.city}, кв. {event.neighborhood}
              </p>

              {canAccessPrivateContent ? (
                <p className="mt-1.5 text-sm text-[#5D5348]">{event.exactAddress}</p>
              ) : (
                <div className="mt-3 flex items-start gap-3 rounded-xl bg-[#EFE8DC] p-3.5 text-xs text-[#1E1915]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#7C232B]" />
                  <div className="space-y-2">
                    <p>
                      <strong>Частен адрес:</strong> Точният адрес и груповият чат са достъпни
                      само за одобрени участници.
                    </p>
                    {myEntry?.status === 'pending_approval' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[#5D5348]">
                          Заявката ти чака организатора ({event.organizerName}).
                        </span>
                        <button
                          type="button"
                          onClick={() => onApproveAttendee(event.id, profile.id, true)}
                          className="rounded-lg bg-[#1C4532] px-2.5 py-1 text-[11px] font-semibold text-[#F7F3EC]"
                        >
                          Симулирай одобрение от организатора
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Venue Change Form for Organizer */}
              {showVenueEdit && isOrganizer && (
                <div className="mt-4 space-y-3 border-t border-[#DDD3C2] pt-4">
                  <input
                    type="text"
                    value={editVenueName}
                    onChange={(e) => setEditVenueName(e.target.value)}
                    placeholder="Ново име на мястото"
                    className="w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Нов точен адрес"
                    className="w-full rounded-lg border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeVenue(event.id, editVenueName, editAddress);
                        setShowVenueEdit(false);
                      }}
                      className="rounded-lg bg-[#1C4532] px-4 py-2 text-xs font-semibold text-[#F7F3EC]"
                    >
                      Запази и уведоми в чата
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVenueEdit(false)}
                      className="rounded-lg border border-[#DDD3C2] px-3 py-2 text-xs font-semibold text-[#5D5348]"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-[#DDD3C2]/70 pt-3">
                <p className="text-xs font-semibold text-[#5D5348]">Планирана храна и мезе</p>
                <p className="mt-1 text-sm text-[#1E1915]">{event.plannedFood}</p>
              </div>
            </div>

            {/* Organizer Controls */}
            {isOrganizer && !event.isCancelled && (
              <div className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-4">
                <h3 className="font-display text-base font-bold text-[#1E1915]">
                  Контрол на организатора
                </h3>

                {pendingAttendees.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#7C232B]">
                      Чакащи одобрение ({pendingAttendees.length})
                    </p>
                    {pendingAttendees.map((att) => (
                      <div
                        key={att.userId}
                        className="flex items-center justify-between rounded-xl bg-[#F7F3EC] px-3.5 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1E1915]">{att.nickname}</p>
                          <p className="text-xs text-[#5D5348]">
                            {HUMOROUS_ROLES[att.roleId].title}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onApproveAttendee(event.id, att.userId, true)}
                            className="rounded-lg bg-[#1C4532] px-3 py-1.5 text-xs font-semibold text-[#F7F3EC]"
                          >
                            Одобри
                          </button>
                          <button
                            type="button"
                            onClick={() => onApproveAttendee(event.id, att.userId, false)}
                            className="rounded-lg border border-[#DDD3C2] px-3 py-1.5 text-xs font-semibold text-[#7C232B]"
                          >
                            Откажи
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#DDD3C2]/70 pt-3">
                  <span className="text-xs text-[#5D5348]">
                    Ако плановете пропаднат, уведоми всички автоматично.
                  </span>
                  <button
                    type="button"
                    onClick={() => onCancelEvent(event.id)}
                    className="rounded-xl border border-[#7C232B] px-3.5 py-2 text-xs font-semibold text-[#7C232B] hover:bg-[#7C232B] hover:text-[#F7F3EC] transition-colors whitespace-nowrap"
                  >
                    Отмени сбирката
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attendees Roster */}
          <div className="lg:col-span-5 rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-[#1E1915]">
                Кой е на масата
              </h2>
              <span className="font-mono text-xs text-[#5D5348] tabular-nums">
                {confirmedAttendees.length} потвърдени
              </span>
            </div>

            <div className="divide-y divide-[#DDD3C2]/70">
              {confirmedAttendees.map((att) => (
                <div key={att.userId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#F7F3EC]"
                      style={{ backgroundColor: att.avatarColor }}
                    >
                      {att.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1E1915] truncate">
                        {att.nickname} {att.isOrganizer ? '(Организатор)' : ''}
                      </p>
                      <p className="text-xs text-[#5D5348] truncate">
                        {HUMOROUS_ROLES[att.roleId].title}
                        {att.nonAlcoholic ? ' · Безалкохолно' : ''}
                        {att.lateMinutes ? ` · Закъснява ${att.lateMinutes} мин` : ''}
                      </p>
                    </div>
                  </div>

                  {att.userId !== profile.id && (
                    <button
                      type="button"
                      onClick={() => onBlockUser(att.userId, att.nickname)}
                      className="text-xs text-[#5D5348] hover:text-[#7C232B] shrink-0"
                      title="Блокирай потребител"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {maybeAttendees.length > 0 && (
              <div className="border-t border-[#DDD3C2] pt-3">
                <p className="text-xs font-semibold text-[#5D5348]">
                  Ще видим ({maybeAttendees.length})
                </p>
                <p className="mt-1 text-sm text-[#1E1915]">
                  {maybeAttendees.map((a) => a.nickname).join(', ')}
                </p>
              </div>
            )}

            {declinedAttendees.length > 0 && (
              <div className="border-t border-[#DDD3C2] pt-3 space-y-2">
                <p className="text-xs font-semibold text-[#7C232B]">
                  Оправдани отсъствия ({declinedAttendees.length})
                </p>
                {declinedAttendees.map((a) => (
                  <div key={a.userId} className="text-xs text-[#5D5348]">
                    <strong className="text-[#1E1915]">{a.nickname}:</strong> „
                    {a.excuse || 'Ще обясня на следващото заседание.'}“
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Group Chat („Казанът къкри“) */}
      {section === 'chat' && (
        <section className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] overflow-hidden">
          {!canAccessPrivateContent ? (
            <div className="p-8 text-center">
              <Lock className="mx-auto h-8 w-8 text-[#7C232B]" />
              <h2 className="mt-3 font-display text-xl font-bold text-[#1E1915]">
                Чатът „Казанът къкри“ е заключен
              </h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-[#5D5348]">
                Тази сбирка изисква одобрение от организатора. Заяви участие от бутона по-горе, за
                да получиш достъп до чата и точния адрес.
              </p>
              {myEntry?.status === 'pending_approval' && (
                <button
                  type="button"
                  onClick={() => onApproveAttendee(event.id, profile.id, true)}
                  className="mt-4 rounded-xl bg-[#1C4532] px-4 py-2.5 text-xs font-semibold text-[#F7F3EC]"
                >
                  Симулирай одобрение и отключи чата
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Pinned Message Banner */}
              {pinnedMessages.length > 0 && (
                <div className="border-b border-[#DDD3C2] bg-[#EFE8DC]/75 px-5 py-3 flex items-start gap-2.5 text-xs">
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7C232B]" />
                  <div>
                    <span className="font-semibold text-[#1E1915]">Закрепено: </span>
                    <span className="text-[#5D5348]">
                      {pinnedMessages[pinnedMessages.length - 1].text}
                    </span>
                  </div>
                </div>
              )}

              {/* Messages Feed */}
              <div className="max-h-[460px] overflow-y-auto p-5 space-y-4">
                {event.messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="inline-block rounded-lg bg-[#EFE8DC] px-3 py-1.5 text-xs text-[#5D5348]">
                          {msg.text} · <span className="font-mono">{msg.timestamp}</span>
                        </span>
                      </div>
                    );
                  }

                  const isMine = msg.senderId === profile.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 text-xs text-[#5D5348] mb-1">
                        <span className="font-semibold text-[#1E1915]">{msg.senderName}</span>
                        <span className="font-mono">{msg.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => onTogglePinMessage(event.id, msg.id)}
                          className="hover:text-[#7C232B]"
                          title={msg.isPinned ? 'Откачи' : 'Закрепи съобщението'}
                        >
                          <Pin className={`h-3 w-3 ${msg.isPinned ? 'text-[#7C232B]' : ''}`} />
                        </button>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? 'bg-[#1C4532] text-[#F7F3EC]'
                            : 'border border-[#DDD3C2] bg-[#F7F3EC] text-[#1E1915]'
                        }`}
                      >
                        {msg.sticker && (
                          <div className="text-base font-semibold mb-1">{msg.sticker}</div>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                        {msg.locationCard && (
                          <div
                            className={`mt-2 rounded-xl p-2.5 text-xs ${
                              isMine ? 'bg-[#153526]' : 'bg-[#EFE8DC]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{msg.locationCard.venueName}</span>
                            </div>
                            <p className="mt-0.5 opacity-85">
                              {msg.locationCard.city}, кв. {msg.locationCard.neighborhood}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick reactions */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onToggleReaction(event.id, msg.id, emoji)}
                            className={`rounded-lg border px-2 py-0.5 text-xs transition-colors ${
                              users.includes(profile.id)
                                ? 'border-[#1C4532] bg-[#1C4532]/10 text-[#1C4532]'
                                : 'border-[#DDD3C2] bg-[#FDFBF7] text-[#5D5348]'
                            }`}
                          >
                            {emoji} <span className="font-mono tabular-nums">{users.length}</span>
                          </button>
                        ))}
                        {['👍', '😂', '🥂'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => onToggleReaction(event.id, msg.id, em)}
                            className="text-xs opacity-45 hover:opacity-100 px-1"
                            aria-label={`Реагирай с ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sticker Bar */}
              {showStickers && (
                <div className="border-t border-[#DDD3C2] bg-[#F7F3EC] px-4 py-3 flex flex-wrap gap-2">
                  {CHAT_STICKERS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        onSendMessage(event.id, '', { sticker: `${st.symbol} ${st.label}` });
                        setShowStickers(false);
                      }}
                      className="rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-1.5 text-xs font-medium text-[#1E1915] hover:border-[#1C4532]"
                    >
                      {st.symbol} {st.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Composer */}
              <form
                onSubmit={handleChatSubmit}
                className="border-t border-[#DDD3C2] bg-[#FDFBF7] p-3.5 flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setShowStickers((s) => !s)}
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3 py-2.5 text-xs font-semibold text-[#1E1915] hover:bg-[#EFE8DC] min-h-[44px]"
                >
                  Стикери
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSendMessage(event.id, 'Споделям точката за среща на масата:', {
                      shareLocation: true,
                    })
                  }
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] p-2.5 text-[#1C4532] hover:bg-[#EFE8DC] min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Сподели мястото на срещата"
                  aria-label="Сподели мястото на срещата"
                >
                  <MapPin className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Напиши нещо в „Казанът къкри“..."
                  className="flex-1 min-w-[160px] rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-2.5 text-sm text-[#1E1915] focus:border-[#1C4532] focus:outline-none min-h-[44px]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C4532] px-4 py-2.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Изпрати</span>
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Polls („Съдът на мезето“) */}
      {section === 'polls' && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#1E1915]">
                Съдът на мезето
              </h2>
              <p className="text-sm text-[#5D5348]">
                Дружината гласува предварително — решението влиза в официалния дневен ред.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewPoll((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C4532] px-4 py-2.5 text-xs font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[42px]"
            >
              <Plus className="h-4 w-4" />
              <span>Нова анкета</span>
            </button>
          </div>

          {showNewPoll && (
            <form
              onSubmit={handlePollCreate}
              className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-3"
            >
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Въпрос (напр. Домашна или купешка туршия?)"
                className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-4 py-2.5 text-sm"
                required
              />
              <div className="grid gap-2.5 sm:grid-cols-3">
                <input
                  type="text"
                  value={pollOpt1}
                  onChange={(e) => setPollOpt1(e.target.value)}
                  placeholder="Вариант 1"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  value={pollOpt2}
                  onChange={(e) => setPollOpt2(e.target.value)}
                  placeholder="Вариант 2"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  value={pollOpt3}
                  onChange={(e) => setPollOpt3(e.target.value)}
                  placeholder="Вариант 3 (по избор)"
                  className="rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPoll(false)}
                  className="rounded-xl border border-[#DDD3C2] px-4 py-2 text-xs font-semibold text-[#5D5348]"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1C4532] px-4 py-2 text-xs font-semibold text-[#F7F3EC]"
                >
                  Внеси в Съда
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {event.polls.map((poll) => {
              const totalVotes = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
              const sorted = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
              const leader = sorted[0];
              const otherVotes = totalVotes - (leader?.votes.length || 0);

              return (
                <div
                  key={poll.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-5 space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-[#1E1915]">
                        {poll.question}
                      </h3>
                      {totalVotes >= 2 && (
                        <span className="tavern-stamp text-[#1C4532] shrink-0">ОДОБРЕНО</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#5D5348]">
                      Внесено от {poll.createdBy} ·{' '}
                      <span className="font-mono tabular-nums">{totalVotes} гласа</span>
                    </p>

                    <div className="mt-4 space-y-2.5">
                      {poll.options.map((opt) => {
                        const pct =
                          totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        const votedByMe = opt.votes.includes(profile.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onVotePoll(event.id, poll.id, opt.id)}
                            className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors min-h-[48px] ${
                              votedByMe
                                ? 'border-[#1C4532] bg-[#1C4532]/5'
                                : 'border-[#DDD3C2] bg-[#F7F3EC] hover:border-[#1C4532]/50'
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-[#1C4532]/12 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-[#1E1915] flex items-center gap-2">
                                {votedByMe && <Check className="h-4 w-4 text-[#1C4532]" />}
                                {opt.label}
                              </span>
                              <span className="font-mono text-xs font-semibold text-[#5D5348] tabular-nums shrink-0">
                                {opt.votes.length} ({pct}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Official Verdict Sentence */}
                  {totalVotes > 0 && leader && (
                    <div className="border-t border-[#DDD3C2]/80 pt-3 text-xs leading-relaxed text-[#5D5348]">
                      <strong className="text-[#1E1915]">Официално решение:</strong> „С{' '}
                      <span className="font-mono font-semibold tabular-nums">
                        {leader.votes.length}
                      </span>{' '}
                      гласа ЗА и{' '}
                      <span className="font-mono font-semibold tabular-nums">{otherVotes}</span>{' '}
                      други/въздържали се, Съветът прие <strong>„{leader.label}“</strong> за
                      задължителна точка от дневния ред.“
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 4: Meze Checklist („Кой какво носи?“) */}
      {section === 'meze' && (
        <section className="space-y-5">
          {missingSalad && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[#7C232B]/30 bg-[#7C232B]/10 p-4 text-sm text-[#7C232B]"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="font-semibold">
                Внимание! Дружината е организирана, но краставиците още нямат отговорник.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] overflow-hidden">
            <div className="border-b border-[#DDD3C2] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-[#1E1915]">
                  Кой какво носи?
                </h2>
                <p className="text-xs text-[#5D5348]">
                  Поеми задача, за да не остане масата без хляб или салфетки.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-[#1C4532] tabular-nums">
                {event.contributions.filter((c) => c.status !== 'free').length}/
                {event.contributions.length} поети
              </span>
            </div>

            <div className="divide-y divide-[#DDD3C2]/70">
              {event.contributions.map((item) => {
                const isMine = item.assignedToUserId === profile.id;
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          item.status === 'done'
                            ? 'line-through text-[#5D5348]'
                            : 'text-[#1E1915]'
                        }`}
                      >
                        {item.item}
                      </p>
                      <p className="mt-0.5 text-xs text-[#5D5348]">
                        <span className="capitalize">{item.category}</span>
                        <span aria-hidden="true"> · </span>
                        {item.status === 'free' ? (
                          <span className="text-[#7C232B] font-medium">Свободна задача</span>
                        ) : item.status === 'done' ? (
                          <span className="text-[#1C4532] font-medium">
                            Изпълнена от {item.assignedToName}
                          </span>
                        ) : (
                          <span>Поета от {item.assignedToName}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'free' && (
                        <button
                          type="button"
                          onClick={() => onCycleContribution(event.id, item.id, 'claimed')}
                          className="rounded-xl bg-[#1C4532] px-3.5 py-2 text-xs font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[40px]"
                        >
                          Поемам аз
                        </button>
                      )}
                      {item.status === 'claimed' && isMine && (
                        <>
                          <button
                            type="button"
                            onClick={() => onCycleContribution(event.id, item.id, 'done')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C4532] px-3.5 py-2 text-xs font-semibold text-[#F7F3EC] min-h-[40px]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Готово е</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCycleContribution(event.id, item.id, 'free')}
                            className="rounded-xl border border-[#DDD3C2] px-3 py-2 text-xs font-semibold text-[#5D5348] min-h-[40px]"
                          >
                            Освободи
                          </button>
                        </>
                      )}
                      {item.status === 'done' && isMine && (
                        <button
                          type="button"
                          onClick={() => onCycleContribution(event.id, item.id, 'claimed')}
                          className="rounded-xl border border-[#DDD3C2] px-3 py-2 text-xs font-semibold text-[#5D5348] min-h-[40px]"
                        >
                          Върни в процес
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new contribution item */}
            <form
              onSubmit={handleAddMeze}
              className="border-t border-[#DDD3C2] bg-[#F7F3EC] p-4 flex flex-wrap gap-2.5"
            >
              <input
                type="text"
                value={newMezeItem}
                onChange={(e) => setNewMezeItem(e.target.value)}
                placeholder="Добави нещо за масата (напр. Лед, Кьопоолу, Лимонада)..."
                className="flex-1 min-w-[200px] rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3.5 py-2.5 text-sm min-h-[44px]"
              />
              <select
                value={newMezeCategory}
                onChange={(e) =>
                  setNewMezeCategory(e.target.value as MezeContribution['category'])
                }
                className="rounded-xl border border-[#DDD3C2] bg-[#FDFBF7] px-3 py-2.5 text-sm min-h-[44px]"
              >
                <option value="салата">Салата</option>
                <option value="мезе">Мезе</option>
                <option value="скара">Скара</option>
                <option value="напитки">Напитки</option>
                <option value="логистика">Логистика</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-[#1C4532] px-4 py-2.5 text-sm font-semibold text-[#F7F3EC] hover:bg-[#153526] min-h-[44px]"
              >
                Добави
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1915]/60 p-4"
          onClick={() => setShowReportModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#DDD3C2] bg-[#FDFBF7] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-[#7C232B]">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-display text-lg font-bold text-[#1E1915]">
                Докладвай за модерация
              </h3>
            </div>
            <p className="text-sm text-[#5D5348]">
              Сигнал за: <strong>{showReportModal.name}</strong>
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-[#DDD3C2] bg-[#F7F3EC] px-3.5 py-2.5 text-sm"
            >
              <option>Неподходящо съдържание или спам</option>
              <option>Опит за продажба или реклама на алкохол</option>
              <option>Неуважително поведение към участници</option>
              <option>Невярно място или фалшива сбирка</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(null)}
                className="rounded-xl border border-[#DDD3C2] px-4 py-2 text-xs font-semibold text-[#5D5348]"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={() => {
                  onReportTarget(
                    showReportModal.type,
                    showReportModal.id,
                    showReportModal.name,
                    reportReason
                  );
                  setShowReportModal(null);
                }}
                className="rounded-xl bg-[#7C232B] px-4 py-2 text-xs font-semibold text-[#F7F3EC]"
              >
                Изпрати сигнал
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
