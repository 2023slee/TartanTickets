import EventList from "./EventList";

export default function Home() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="brand">Tartan Tickets</p>
        <h1>Upcoming events</h1>
      </header>
      <EventList />
    </main>
  );
}
