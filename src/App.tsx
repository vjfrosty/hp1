import { useEffect, useState } from 'react';
import { ActiveTab } from './types/app';
import { useAppStore } from './store/useAppStore';
import { AppShell } from './components/AppShell';
import { AgeGateModal } from './components/AgeGateModal';
import { FeedView } from './components/FeedView';
import { RadarMapView } from './components/RadarMapView';
import { CreateEventView } from './components/CreateEventView';
import { EventDetailView } from './components/EventDetailView';
import { GroupsView } from './components/GroupsView';
import { ProfileView } from './components/ProfileView';

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Handle shareable invite links (?invite=evt_1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (inviteId && store.events.some((e) => e.id === inviteId)) {
      setSelectedEventId(inviteId);
      setActiveTab('event');
    }
  }, []);

  const openEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveTab('event');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedEvent =
    store.events.find((e) => e.id === selectedEventId) || store.events[0] || null;

  return (
    <>
      {!store.ageConfirmed && <AgeGateModal onConfirm={store.confirmAge} />}

      <AppShell
        activeTab={activeTab}
        onNavigate={navigate}
        notifications={store.notifications}
        unreadCount={store.unreadCount}
        onMarkNotificationsRead={store.markNotificationsRead}
        onOpenEvent={openEvent}
        toastMessage={store.toastMessage}
      >
        {activeTab === 'feed' && (
          <FeedView
            events={store.events}
            profile={store.profile}
            onOpenEvent={openEvent}
            onQuickRSVP={(id, status) => store.setRSVP(id, status)}
            onGoCreate={() => navigate('create')}
            onGoRadar={() => navigate('radar')}
          />
        )}

        {activeTab === 'radar' && (
          <RadarMapView
            events={store.events}
            profile={store.profile}
            onToggleRadar={store.toggleRadar}
            onOpenEvent={openEvent}
          />
        )}

        {activeTab === 'create' && (
          <CreateEventView
            profile={store.profile}
            onCreate={(input) => {
              const newId = store.createEvent(input);
              openEvent(newId);
            }}
            onCancel={() => navigate('feed')}
          />
        )}

        {activeTab === 'event' && selectedEvent && (
          <EventDetailView
            event={selectedEvent}
            profile={store.profile}
            onBack={() => navigate('feed')}
            onSetRSVP={store.setRSVP}
            onApproveAttendee={store.approveAttendee}
            onChangeVenue={store.changeEventVenue}
            onCancelEvent={store.cancelEvent}
            onSendMessage={store.sendMessage}
            onToggleReaction={store.toggleReaction}
            onTogglePinMessage={store.togglePinMessage}
            onVotePoll={store.votePoll}
            onAddPoll={store.addPoll}
            onCycleContribution={store.cycleContribution}
            onAddContribution={store.addContribution}
            onReportTarget={store.reportTarget}
            onBlockUser={store.blockUser}
            onShowToast={store.showToast}
          />
        )}

        {(activeTab === 'groups' || activeTab === 'chronicle') && (
          <GroupsView
            initialMode={activeTab === 'chronicle' ? 'chronicle' : 'groups'}
            groups={store.groups}
            chronicles={store.chronicles}
            wisdom={store.wisdom}
            profile={store.profile}
            onToggleGroupMembership={store.toggleGroupMembership}
            onCreateGroup={store.createGroup}
            onVoteQuorumSlot={store.voteQuorumSlot}
            onAddChronicle={store.addChronicle}
            onToggleChronicleLike={store.toggleChronicleLike}
            onAddWisdom={store.addWisdom}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={store.profile}
            reports={store.reports}
            onUpdateProfile={store.updateProfile}
            onUnblockUser={store.unblockUser}
            onExportGDPR={store.exportPersonalData}
            onDeleteGDPR={store.deleteAllPersonalData}
          />
        )}
      </AppShell>
    </>
  );
}
