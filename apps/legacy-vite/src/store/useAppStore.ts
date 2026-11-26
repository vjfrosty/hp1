import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppNotification,
  ChronicleEntry,
  GatheringEvent,
  GroupCouncil,
  MezeContribution,
  MezeStatus,
  ModerationReport,
  RSVPStatus,
  SeasonalThemeId,
  TableWisdom,
  UserProfile,
  VenueType,
} from '../types/app';
import {
  BULGARIAN_CITIES,
  DEFAULT_MEZE_TASKS,
} from '../data/bulgaria';
import {
  IMAGES,
  INITIAL_CHRONICLES,
  INITIAL_EVENTS,
  INITIAL_GROUPS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_PROFILE,
  INITIAL_WISDOM,
} from '../data/seedData';

const STORAGE_KEY = 'aide_po_edna_state_v1';
const AGE_KEY = 'aide_po_edna_age_confirmed_v1';
const CHANNEL_NAME = 'aide_po_edna_sync_v1';

interface PersistedState {
  profile: UserProfile;
  events: GatheringEvent[];
  groups: GroupCouncil[];
  chronicles: ChronicleEntry[];
  wisdom: TableWisdom[];
  notifications: AppNotification[];
  reports: ModerationReport[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && parsed.profile && Array.isArray(parsed.events)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data if storage is unavailable or corrupted
  }
  return {
    profile: INITIAL_USER_PROFILE,
    events: INITIAL_EVENTS,
    groups: INITIAL_GROUPS,
    chronicles: INITIAL_CHRONICLES,
    wisdom: INITIAL_WISDOM,
    notifications: INITIAL_NOTIFICATIONS,
    reports: [],
  };
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface CreateEventInput {
  title: string;
  dateISO: string;
  time: string;
  city: string;
  neighborhood: string;
  venueName: string;
  exactAddress: string;
  venueType: VenueType;
  maxAttendees: number;
  isPrivate: boolean;
  manualApproval: boolean;
  plannedFood: string;
  description: string;
  nonAlcoholicFriendly: boolean;
  seasonalTheme: SeasonalThemeId;
}

export function useAppStore() {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Persist to localStorage & broadcast to sibling browser tabs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: 'SYNC', payload: state });
        bc.close();
      }
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  // Listen to cross-tab updates
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      if (ev.data?.type === 'SYNC' && ev.data?.payload) {
        setState(ev.data.payload);
      }
    };
    return () => bc.close();
  }, []);

  const confirmAge = useCallback(() => {
    setAgeConfirmed(true);
    try {
      localStorage.setItem(AGE_KEY, 'true');
    } catch {
      // Ignore
    }
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setState((prev) => {
        const nextProfile = { ...prev.profile, ...patch };
        return { ...prev, profile: nextProfile };
      });
      showToast('Ракиеният паспорт е обновен.');
    },
    [showToast]
  );

  const toggleRadar = useCallback(
    (active: boolean, radiusKm?: number, message?: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          radarActive: active,
          radarRadiusKm: radiusKm ?? prev.profile.radarRadiusKm,
          radarMessage: message ?? prev.profile.radarMessage,
        },
      }));
      showToast(
        active
          ? 'Ракиеният радар е включен: „Свободен съм за компания тази вечер.“'
          : 'Ракиеният радар е изключен.'
      );
    },
    [showToast]
  );

  const createEvent = useCallback(
    (input: CreateEventInput): string => {
      const id = `evt_${Date.now()}`;
      const cityObj =
        BULGARIAN_CITIES.find((c) => c.name === input.city) || BULGARIAN_CITIES[0];
      const hoodObj =
        cityObj.neighborhoods.find((n) => n.name === input.neighborhood) ||
        cityObj.neighborhoods[0];

      const hour = parseInt(input.time.split(':')[0] || '19', 10);
      const timeBucket = hour < 18 ? 'ранен вечер' : hour >= 21 ? 'късно' : 'вечер';

      const todayStr = new Date().toISOString().slice(0, 10);
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      let dateLabel: GatheringEvent['dateLabel'] = 'тази седмица';
      if (input.dateISO === todayStr) dateLabel = 'днес';
      else if (input.dateISO === tomorrowStr) dateLabel = 'утре';
      else {
        const day = new Date(input.dateISO).getDay();
        if (day === 0 || day === 6) dateLabel = 'уикенда';
      }

      const coverByVenue: Record<VenueType, string> = {
        механа: IMAGES.heroMehana,
        кръчма: IMAGES.heroMehana,
        двор: IMAGES.bbqYard,
        вила: IMAGES.villaFire,
        'домашна маса': IMAGES.homeTable,
      };

      const contributions: MezeContribution[] = DEFAULT_MEZE_TASKS.slice(0, 6).map((t, i) => ({
        id: `c_${Date.now()}_${i}`,
        item: t.item,
        category: t.category,
        status: 'free',
      }));

      setState((prev) => {
        const newEvent: GatheringEvent = {
          id,
          title: input.title.trim(),
          description:
            input.description.trim() ||
            'Спокойна мъжка сбирка на добра маса и разговор.',
          dateISO: input.dateISO,
          dateLabel,
          time: input.time,
          timeBucket,
          city: input.city,
          neighborhood: input.neighborhood,
          venueName: input.venueName.trim() || `${input.venueType} в ${input.neighborhood}`,
          exactAddress:
            input.exactAddress.trim() ||
            `${input.city}, кв. ${input.neighborhood} (детайли в чата)`,
          venueType: input.venueType,
          coords: [
            hoodObj.coords[0] + (Math.random() - 0.5) * 0.008,
            hoodObj.coords[1] + (Math.random() - 0.5) * 0.008,
          ],
          maxAttendees: input.maxAttendees,
          isPrivate: input.isPrivate,
          manualApproval: input.manualApproval,
          friendsOnly: input.isPrivate,
          plannedFood: input.plannedFood.trim() || 'Шопска салата, сирене и скара',
          nonAlcoholicFriendly: input.nonAlcoholicFriendly,
          seasonalTheme: input.seasonalTheme,
          coverImage: coverByVenue[input.venueType],
          organizerId: prev.profile.id,
          organizerName: prev.profile.nickname,
          attendees: [
            {
              userId: prev.profile.id,
              nickname: prev.profile.nickname,
              avatarInitials: prev.profile.avatarInitials,
              avatarColor: prev.profile.avatarColor,
              roleId: prev.profile.roleId,
              status: 'confirmed',
              isOrganizer: true,
              nonAlcoholic: prev.profile.nonAlcoholicPreferred,
              joinedAt: nowHHMM(),
            },
          ],
          messages: [
            {
              id: `sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'Система',
              text: `${prev.profile.nickname} свика дружината. Масата чака кворум!`,
              timestamp: nowHHMM(),
              isSystem: true,
              reactions: {},
            },
          ],
          polls: [
            {
              id: `poll_${Date.now()}`,
              question: 'Шопска или овчарска салата да е задължителна точка?',
              createdBy: prev.profile.nickname,
              isOfficialCourt: true,
              options: [
                { id: `o_${Date.now()}_1`, label: 'Шопска салата', votes: [prev.profile.id] },
                { id: `o_${Date.now()}_2`, label: 'Овчарска салата', votes: [] },
                { id: `o_${Date.now()}_3`, label: 'Домашна туршия', votes: [] },
              ],
            },
          ],
          contributions,
        };

        const notif: AppNotification = {
          id: `n_${Date.now()}`,
          type: 'invite',
          title: 'Събранието е свикано',
          body: `„${newEvent.title}“ вече приема потвърждения. Сподели линка с дружината!`,
          eventId: id,
          timestamp: 'Току-що',
          read: false,
        };

        return {
          ...prev,
          events: [newEvent, ...prev.events],
          notifications: [notif, ...prev.notifications],
        };
      });

      showToast('Събранието е свикано. Дано този път всички дойдат.');
      return id;
    },
    [showToast]
  );

  const setRSVP = useCallback(
    (
      eventId: string,
      status: RSVPStatus,
      options?: { excuse?: string; lateMinutes?: number; nonAlcoholic?: boolean }
    ) => {
      setState((prev) => {
        const profile = prev.profile;
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;

          const existing = evt.attendees.find((a) => a.userId === profile.id);
          const confirmedCount = evt.attendees.filter(
            (a) => a.status === 'confirmed' && a.userId !== profile.id
          ).length;

          // Determine final status respecting manual approval & seat cap
          let nextStatus = status;
          if (status === 'confirmed') {
            if (confirmedCount >= evt.maxAttendees) {
              showToast('Всички столове около масата са заети.');
              return evt;
            }
            if (
              evt.manualApproval &&
              evt.organizerId !== profile.id &&
              existing?.status !== 'confirmed'
            ) {
              nextStatus = 'pending_approval';
            }
          }

          const updatedAttendee = {
            userId: profile.id,
            nickname: profile.nickname,
            avatarInitials: profile.avatarInitials,
            avatarColor: profile.avatarColor,
            roleId: profile.roleId,
            status: nextStatus,
            isOrganizer: evt.organizerId === profile.id,
            nonAlcoholic: options?.nonAlcoholic ?? existing?.nonAlcoholic ?? profile.nonAlcoholicPreferred,
            lateMinutes: options?.lateMinutes,
            excuse: status === 'declined' ? options?.excuse : undefined,
            joinedAt: nowHHMM(),
          };

          const attendees = existing
            ? evt.attendees.map((a) => (a.userId === profile.id ? updatedAttendee : a))
            : [...evt.attendees, updatedAttendee];

          let systemText = '';
          if (nextStatus === 'confirmed') {
            if (options?.lateMinutes) {
              systemText = `${profile.nickname} пак е на ${options.lateMinutes} минути.`;
            } else {
              systemText = `${profile.nickname} потвърди. Събранието става сериозно.`;
            }
          } else if (nextStatus === 'pending_approval') {
            systemText = `${profile.nickname} почука на вратата и чака одобрение от организатора.`;
          } else if (nextStatus === 'maybe') {
            systemText = `${profile.nickname} каза „Ще видим“ (без запазен стол).`;
          } else if (nextStatus === 'declined') {
            systemText = `${profile.nickname} пропуска: „${options?.excuse || 'Ще обясня на следващото заседание.'}“`;
          }

          const newMessages = systemText
            ? [
                ...evt.messages,
                {
                  id: `sys_${Date.now()}`,
                  senderId: 'system',
                  senderName: 'Система',
                  text: systemText,
                  timestamp: nowHHMM(),
                  isSystem: true,
                  reactions: {},
                },
              ]
            : evt.messages;

          return { ...evt, attendees, messages: newMessages };
        });

        return { ...prev, events };
      });

      if (status === 'confirmed') {
        showToast(
          options?.lateMinutes
            ? `Записано: закъсняваш с ${options.lateMinutes} минути.`
            : 'Статусът ти е обновен. Столът те чака!'
        );
      } else if (status === 'maybe') {
        showToast('Отбелязахме интерес — без запазено място.');
      } else if (status === 'declined') {
        showToast('Записахме оправданието. Дружината ще го обсъди.');
      }
    },
    [showToast]
  );

  // Organizer approval / simulation so users can test private event access control
  const approveAttendee = useCallback(
    (eventId: string, userId: string, approve: boolean) => {
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          const target = evt.attendees.find((a) => a.userId === userId);
          if (!target) return evt;

          const attendees = evt.attendees.map((a) =>
            a.userId === userId
              ? { ...a, status: approve ? ('confirmed' as RSVPStatus) : ('declined' as RSVPStatus) }
              : a
          );

          const sysMsg = approve
            ? `${target.nickname} е одобрен. Кворумът и достъпът до адреса са отворени.`
            : `Заявката на ${target.nickname} не беше одобрена.`;

          return {
            ...evt,
            attendees,
            messages: [
              ...evt.messages,
              {
                id: `sys_${Date.now()}`,
                senderId: 'system',
                senderName: 'Система',
                text: sysMsg,
                timestamp: nowHHMM(),
                isSystem: true,
                reactions: {},
              },
            ],
          };
        });

        const notif: AppNotification = {
          id: `n_${Date.now()}`,
          type: 'approval',
          title: approve ? 'Одобрен достъп до сбирката' : 'Отказана заявка',
          body: approve
            ? 'Точният адрес и груповият чат вече са отключени.'
            : 'Организаторът отказа заявката за присъединяване.',
          eventId,
          timestamp: 'Току-що',
          read: false,
        };

        return { ...prev, events, notifications: [notif, ...prev.notifications] };
      });
      showToast(approve ? 'Участникът е одобрен!' : 'Заявката е отхвърлена.');
    },
    [showToast]
  );

  const changeEventVenue = useCallback(
    (eventId: string, newVenueName: string, newAddress: string) => {
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          return {
            ...evt,
            venueName: newVenueName,
            exactAddress: newAddress,
            messages: [
              ...evt.messages,
              {
                id: `sys_${Date.now()}`,
                senderId: 'system',
                senderName: 'Система',
                text: `Мястото е сменено на „${newVenueName}“. Никой да не тръгва по стария адрес!`,
                timestamp: nowHHMM(),
                isSystem: true,
                isPinned: true,
                locationCard: {
                  venueName: newVenueName,
                  neighborhood: evt.neighborhood,
                  city: evt.city,
                },
                reactions: {},
              },
            ],
          };
        });
        const notif: AppNotification = {
          id: `n_${Date.now()}`,
          type: 'change',
          title: 'Смяна на мястото!',
          body: `Новото място е „${newVenueName}“. Никой да не тръгва по стария адрес!`,
          eventId,
          timestamp: 'Току-що',
          read: false,
        };
        return { ...prev, events, notifications: [notif, ...prev.notifications] };
      });
      showToast('Мястото е обновено и изпратено в чата.');
    },
    [showToast]
  );

  const cancelEvent = useCallback(
    (eventId: string) => {
      setState((prev) => {
        const target = prev.events.find((e) => e.id === eventId);
        const events = prev.events.map((evt) =>
          evt.id === eventId
            ? {
                ...evt,
                isCancelled: true,
                messages: [
                  ...evt.messages,
                  {
                    id: `sys_${Date.now()}`,
                    senderId: 'system',
                    senderName: 'Система',
                    text: 'Заседанието се отлага по независещи от салатата причини.',
                    timestamp: nowHHMM(),
                    isSystem: true,
                    reactions: {},
                  },
                ],
              }
            : evt
        );
        const notif: AppNotification = {
          id: `n_${Date.now()}`,
          type: 'cancel',
          title: 'Отменена сбирка',
          body: `„${target?.title || 'Сбирка'}“ — Заседанието се отлага по независещи от салатата причини.`,
          eventId,
          timestamp: 'Току-що',
          read: false,
        };
        return { ...prev, events, notifications: [notif, ...prev.notifications] };
      });
      showToast('Заседанието се отлага по независещи от салатата причини.');
    },
    [showToast]
  );

  const sendMessage = useCallback(
    (
      eventId: string,
      text: string,
      opts?: { sticker?: string; shareLocation?: boolean }
    ) => {
      if (!text.trim() && !opts?.sticker && !opts?.shareLocation) return;
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          const msg = {
            id: `msg_${Date.now()}`,
            senderId: prev.profile.id,
            senderName: prev.profile.nickname,
            text: text.trim(),
            timestamp: nowHHMM(),
            sticker: opts?.sticker,
            locationCard: opts?.shareLocation
              ? {
                  venueName: evt.venueName,
                  neighborhood: evt.neighborhood,
                  city: evt.city,
                }
              : undefined,
            reactions: {},
          };
          return { ...evt, messages: [...evt.messages, msg] };
        });
        return { ...prev, events };
      });
    },
    []
  );

  const toggleReaction = useCallback((eventId: string, messageId: string, emoji: string) => {
    setState((prev) => {
      const uid = prev.profile.id;
      const events = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const messages = evt.messages.map((m) => {
          if (m.id !== messageId) return m;
          const list = m.reactions[emoji] || [];
          const nextList = list.includes(uid)
            ? list.filter((id) => id !== uid)
            : [...list, uid];
          const nextReactions = { ...m.reactions };
          if (nextList.length === 0) delete nextReactions[emoji];
          else nextReactions[emoji] = nextList;
          return { ...m, reactions: nextReactions };
        });
        return { ...evt, messages };
      });
      return { ...prev, events };
    });
  }, []);

  const togglePinMessage = useCallback((eventId: string, messageId: string) => {
    setState((prev) => {
      const events = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        return {
          ...evt,
          messages: evt.messages.map((m) =>
            m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
          ),
        };
      });
      return { ...prev, events };
    });
  }, []);

  const votePoll = useCallback((eventId: string, pollId: string, optionId: string) => {
    setState((prev) => {
      const uid = prev.profile.id;
      const events = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const polls = evt.polls.map((poll) => {
          if (poll.id !== pollId) return poll;
          return {
            ...poll,
            options: poll.options.map((opt) => {
              const cleaned = opt.votes.filter((id) => id !== uid);
              return opt.id === optionId
                ? { ...opt, votes: [...cleaned, uid] }
                : { ...opt, votes: cleaned };
            }),
          };
        });
        return { ...evt, polls };
      });
      return { ...prev, events };
    });
  }, []);

  const addPoll = useCallback(
    (eventId: string, question: string, options: string[]) => {
      const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim() || cleanOpts.length < 2) return;
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          const newPoll = {
            id: `poll_${Date.now()}`,
            question: question.trim(),
            createdBy: prev.profile.nickname,
            isOfficialCourt: true,
            options: cleanOpts.map((label, idx) => ({
              id: `opt_${Date.now()}_${idx}`,
              label,
              votes: [],
            })),
          };
          return { ...evt, polls: [newPoll, ...evt.polls] };
        });
        return { ...prev, events };
      });
      showToast('Анкетата е внесена в „Съдът на мезето“.');
    },
    [showToast]
  );

  const cycleContribution = useCallback(
    (eventId: string, contributionId: string, nextStatus: MezeStatus) => {
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          const contributions = evt.contributions.map((c) => {
            if (c.id !== contributionId) return c;
            if (nextStatus === 'free') {
              return {
                ...c,
                status: 'free' as MezeStatus,
                assignedToUserId: undefined,
                assignedToName: undefined,
              };
            }
            return {
              ...c,
              status: nextStatus,
              assignedToUserId: prev.profile.id,
              assignedToName: prev.profile.nickname,
            };
          });
          return { ...evt, contributions };
        });
        return { ...prev, events };
      });
    },
    []
  );

  const addContribution = useCallback(
    (eventId: string, item: string, category: MezeContribution['category']) => {
      if (!item.trim()) return;
      setState((prev) => {
        const events = prev.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          return {
            ...evt,
            contributions: [
              ...evt.contributions,
              {
                id: `c_${Date.now()}`,
                item: item.trim(),
                category,
                status: 'free' as MezeStatus,
              },
            ],
          };
        });
        return { ...prev, events };
      });
      showToast('Задачата е добавена към масата.');
    },
    [showToast]
  );

  const toggleGroupMembership = useCallback(
    (groupId: string) => {
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          const joining = !g.isMember;
          return {
            ...g,
            isMember: joining,
            memberCount: joining ? g.memberCount + 1 : Math.max(1, g.memberCount - 1),
            memberNames: joining
              ? [...g.memberNames, prev.profile.nickname]
              : g.memberNames.filter((n) => n !== prev.profile.nickname),
          };
        }),
      }));
      showToast('Членството в дружината е обновено.');
    },
    [showToast]
  );

  const createGroup = useCallback(
    (name: string, motto: string, city: string, regularSchedule: string) => {
      if (!name.trim()) return;
      setState((prev) => {
        const newGroup: GroupCouncil = {
          id: `grp_${Date.now()}`,
          name: name.trim(),
          motto: motto.trim() || 'Редовна маса, добра дума.',
          city,
          memberCount: 1,
          memberNames: [prev.profile.nickname],
          regularSchedule: regularSchedule.trim() || 'Петък вечер',
          quorumRequired: 3,
          meetingsHeld: 0,
          isMember: true,
          quorumSlots: [
            {
              id: `qs_${Date.now()}_1`,
              label: 'Петък вечер',
              dateLabel: 'Този петък',
              time: '19:30',
              voterIds: [prev.profile.id],
            },
            {
              id: `qs_${Date.now()}_2`,
              label: 'Събота следобед',
              dateLabel: 'Тази събота',
              time: '16:00',
              voterIds: [],
            },
          ],
        };
        return { ...prev, groups: [newGroup, ...prev.groups] };
      });
      showToast('Новият „Кръчмарски съвет“ е учреден!');
    },
    [showToast]
  );

  const voteQuorumSlot = useCallback(
    (groupId: string, slotId: string) => {
      setState((prev) => {
        const uid = prev.profile.id;
        let quorumReachedTitle: string | null = null;
        const groups = prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          const quorumSlots = g.quorumSlots.map((slot) => {
            if (slot.id !== slotId) return slot;
            const voted = slot.voterIds.includes(uid);
            const nextVoters = voted
              ? slot.voterIds.filter((id) => id !== uid)
              : [...slot.voterIds, uid];
            if (!voted && nextVoters.length >= g.quorumRequired) {
              quorumReachedTitle = `${g.name}: ${slot.label} (${slot.time})`;
            }
            return { ...slot, voterIds: nextVoters };
          });
          return { ...g, quorumSlots };
        });

        const notifications = quorumReachedTitle
          ? [
              {
                id: `n_${Date.now()}`,
                type: 'quorum' as const,
                title: 'Кворумът е събран!',
                body: `Общият удобен час за ${quorumReachedTitle} вече има достатъчно гласове.`,
                timestamp: 'Току-що',
                read: false,
              },
              ...prev.notifications,
            ]
          : prev.notifications;

        return { ...prev, groups, notifications };
      });
    },
    []
  );

  const addChronicle = useCallback(
    (entry: {
      eventTitle: string;
      groupName: string;
      officialDecision: string;
      story: string;
      visibility: ChronicleEntry['visibility'];
      consentConfirmed: boolean;
    }) => {
      if (!entry.consentConfirmed) {
        showToast('Нужно е съгласието на участниците преди публикуване в летописа.');
        return;
      }
      setState((prev) => ({
        ...prev,
        chronicles: [
          {
            id: `chr_${Date.now()}`,
            eventTitle: entry.eventTitle.trim() || 'Вечерна сбирка',
            groupName: entry.groupName.trim() || 'Дружината',
            dateLabel: 'Днес',
            city: prev.profile.city,
            officialDecision: entry.officialDecision.trim(),
            story: entry.story.trim(),
            authorName: prev.profile.nickname,
            visibility: entry.visibility,
            consentConfirmed: true,
            taggedParticipants: [prev.profile.nickname],
            likes: 1,
            likedByMe: true,
          },
          ...prev.chronicles,
        ],
      }));
      showToast('Записът е добавен в „Летопис на дружината“.');
    },
    [showToast]
  );

  const toggleChronicleLike = useCallback((chronicleId: string) => {
    setState((prev) => ({
      ...prev,
      chronicles: prev.chronicles.map((c) =>
        c.id === chronicleId
          ? {
              ...c,
              likedByMe: !c.likedByMe,
              likes: c.likedByMe ? Math.max(0, c.likes - 1) : c.likes + 1,
            }
          : c
      ),
    }));
  }, []);

  const addWisdom = useCallback(
    (quote: string, context: string, sharedToGroup: boolean, consentGiven: boolean) => {
      if (!quote.trim()) return;
      setState((prev) => ({
        ...prev,
        wisdom: [
          {
            id: `w_${Date.now()}`,
            quote: quote.trim(),
            authorNickname: prev.profile.nickname,
            context: context.trim() || 'От последната маса',
            consentGiven,
            sharedToGroup,
            dateLabel: 'Днес',
          },
          ...prev.wisdom,
        ],
      }));
      showToast('Мъдростта от масата е записана.');
    },
    [showToast]
  );

  const markNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const reportTarget = useCallback(
    (targetType: 'event' | 'user', targetId: string, targetName: string, reason: string) => {
      setState((prev) => ({
        ...prev,
        reports: [
          {
            id: `rep_${Date.now()}`,
            targetType,
            targetId,
            targetName,
            reason,
            createdAt: nowHHMM(),
          },
          ...prev.reports,
        ],
      }));
      showToast('Сигналът е изпратен за модерация. Благодарим за грижата за компанията.');
    },
    [showToast]
  );

  const blockUser = useCallback(
    (userId: string, nickname: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          blockedUserIds: prev.profile.blockedUserIds.includes(userId)
            ? prev.profile.blockedUserIds
            : [...prev.profile.blockedUserIds, userId],
        },
      }));
      showToast(`${nickname} е блокиран. Няма да виждаш негови сбирки и съобщения.`);
    },
    [showToast]
  );

  const unblockUser = useCallback(
    (userId: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          blockedUserIds: prev.profile.blockedUserIds.filter((id) => id !== userId),
        },
      }));
      showToast('Потребителят е отблокиран.');
    },
    [showToast]
  );

  const exportPersonalData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state.profile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rakien-pasport-gdpr-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Личните ти данни (GDPR експорт) са изтеглени.');
  }, [state.profile, showToast]);

  const deleteAllPersonalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AGE_KEY);
    } catch {
      // Ignore
    }
    setState({
      profile: {
        ...INITIAL_USER_PROFILE,
        nickname: 'Нов участник',
        avatarInitials: 'НУ',
        earnedBadges: [],
        blockedUserIds: [],
      },
      events: INITIAL_EVENTS,
      groups: INITIAL_GROUPS,
      chronicles: INITIAL_CHRONICLES,
      wisdom: INITIAL_WISDOM,
      notifications: [],
      reports: [],
    });
    setAgeConfirmed(false);
    showToast('Профилът и локалните лични данни са изтрити съгласно GDPR.');
  }, [showToast]);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  return {
    ...state,
    ageConfirmed,
    confirmAge,
    toastMessage,
    showToast,
    unreadCount,
    updateProfile,
    toggleRadar,
    createEvent,
    setRSVP,
    approveAttendee,
    changeEventVenue,
    cancelEvent,
    sendMessage,
    toggleReaction,
    togglePinMessage,
    votePoll,
    addPoll,
    cycleContribution,
    addContribution,
    toggleGroupMembership,
    createGroup,
    voteQuorumSlot,
    addChronicle,
    toggleChronicleLike,
    addWisdom,
    markNotificationsRead,
    reportTarget,
    blockUser,
    unblockUser,
    exportPersonalData,
    deleteAllPersonalData,
  };
}
