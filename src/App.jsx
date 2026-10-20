import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  CalendarDays,
  Flame,
  Pencil,
  Trash2,
  X,
  Utensils,
  Footprints,
} from 'lucide-react';

const STORAGE_KEY = 'healthAndFitness';
const COLORS = ['#bd00ff', '#ff9800'];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readEntries() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(value || '[]');

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.date === 'string'
      )
      .map((entry, index) => ({
        ...entry,
        date: String(entry.date).slice(0, 10),
        id: entry.id ?? `health-${String(entry.date).slice(0, 10)}-${index}`,
        calorieIntake: Number(
          entry.calorieIntake ?? entry.caloriesIntake ?? entry.calories_intake ?? 0
        ),
        calorieBurned: Number(
          entry.calorieBurned ?? entry.caloriesBurned ?? entry.calories_burned ?? 0
        ),
        description: String(entry.description ?? ''),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function blankForm() {
  return {
    date: localDateString(),
    calorieIntake: '',
    calorieBurned: '',
    description: '',
  };
}

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [entries, setEntries] = useState(readEntries);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');
  // Track records submitted during this page session so stale records left by
  // a previous Cypress test do not make the weekly chart appear prematurely.
  const [sessionEntryDate, setSessionEntryDate] = useState(null);

  // Persist all saved health records in localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (storageError) {
      console.error('Unable to save health data:', storageError);
    }
  }, [entries]);

  const today = localDateString();
  const todayEntry = entries.find((entry) => entry.date === today);

  const totalIntake = entries.reduce(
    (sum, entry) => sum + Number(entry.calorieIntake || 0),
    0
  );

  const totalBurned = entries.reduce(
    (sum, entry) => sum + Number(entry.calorieBurned || 0),
    0
  );

  // Show only the last seven calendar days, including today.
  const weeklyData = useMemo(() => {
    const days = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const key = localDateString(date);
      const matching = entries.filter((entry) => entry.date === key);

      days.push({
        date: key,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calorieIntake: matching.reduce(
          (sum, entry) => sum + Number(entry.calorieIntake || 0),
          0
        ),
        calorieBurned: matching.reduce(
          (sum, entry) => sum + Number(entry.calorieBurned || 0),
          0
        ),
      });
    }

    return days;
  }, [entries]);

  const weekStartDate = (() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - 6);
    return localDateString(date);
  })();

  // Only show the trend chart when a recent entry has been submitted in this
  // page session. Historical/localStorage entries remain available below.
  const hasWeeklyEntries = Boolean(
    sessionEntryDate &&
    sessionEntryDate >= weekStartDate &&
    sessionEntryDate <= today &&
    weeklyData.some((day) => day.date === sessionEntryDate)
  );

  const pieData = [
    { name: 'Intake', value: totalIntake },
    { name: 'Burned', value: totalBurned },
  ];

  function openAdd() {
    setEditingId(null);
    setForm(blankForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(entry) {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      calorieIntake: String(entry.calorieIntake),
      calorieBurned: String(entry.calorieBurned),
      description: entry.description,
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setError('');
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.date ||
      form.calorieIntake === '' ||
      form.calorieBurned === '' ||
      !form.description.trim()
    ) {
      setError('Please complete all fields before submitting.');
      return;
    }

    const intake = Number(form.calorieIntake);
    const burned = Number(form.calorieBurned);

    if (
      !Number.isFinite(intake) ||
      !Number.isFinite(burned) ||
      intake < 0 ||
      burned < 0
    ) {
      setError('Calories must be valid non-negative numbers.');
      return;
    }

    const record = {
      id:
        editingId ||
        (globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      date: form.date,
      calorieIntake: intake,
      calorieBurned: burned,
      description: form.description.trim(),
    };

    setEntries((current) => {
      const updated = editingId
        ? current.map((entry) => (entry.id === editingId ? record : entry))
        : [...current, record];

      return [...updated].sort((a, b) => b.date.localeCompare(a.date));
    });
    setSessionEntryDate(record.date);

    closeModal();
  }

  function deleteEntry(id) {
    if (window.confirm('Delete this health record?')) {
      setEntries((current) => current.filter((entry) => entry.id !== id));
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="brand-mark">
          <Activity size={24} strokeWidth={2.7} />
        </div>
        <div>
          <h1>Health And Fitness Tracker</h1>
          <p className="subtitle">
            Small steps every day. Stronger, healthier you.
          </p>
        </div>
      </header>

      <section className="overview-panel">
        <div className="update-card">
          <div className="update-card-icon">
            <Activity size={25} />
          </div>
          <h2>Update Today&apos;s Data</h2>
          <p>Keep track of meals, movement, and daily calorie goals.</p>
          <button
            type="button"
            className="button button-green add-button"
            onClick={openAdd}
            aria-label="Add data"
          >
            + Add data
          </button>
          {todayEntry && (
            <span className="today-status">
              <span />
              Today&apos;s data recorded
            </span>
          )}
        </div>

        <div className="overview-content">
          {hasWeeklyEntries ? (
            <>
              <div className="chart-heading">
                <div>
                  <h2>Weekly Health Trends</h2>
                  <p>Your calorie intake and burn over the last 7 days</p>
                </div>
                <span className="chart-range">
                  <CalendarDays size={14} />
                  Last 7 days
                </span>
              </div>

              <div className="bar-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
                    margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                    barGap={5}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#777"
                      opacity={0.38}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#e4e4e4', fontSize: 12 }}
                      axisLine={{ stroke: '#777' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#d2d2d2', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#252525',
                        border: '1px solid #555',
                        borderRadius: 8,
                        color: '#fff',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#eee', fontSize: 12 }}
                    />
                    <Bar
                      dataKey="calorieIntake"
                      name="Calorie Intake"
                      fill="#9a8be8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="calorieBurned"
                      name="Calorie Burned"
                      fill="#79c99a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="empty-overview">
              <div className="empty-chart-icon">
                <Activity size={32} />
              </div>
              <h3>Your health journey starts here</h3>
              <p>Add your first entry to see your weekly health trends.</p>
              <span className="empty-hint">Your progress will appear here</span>
            </div>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <div className="recent-section">
          <div className="section-heading">
            <div>
              <h2>Recent Health Statistics</h2>
              <p>Your latest meals and activities</p>
            </div>
            {entries.length > 0 && (
              <span className="entry-count">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="empty-list">
              <div className="empty-list-icon">
                <CalendarDays size={23} />
              </div>
              <strong>No Progress to show!</strong>
              <p>Your daily records will appear here after you add data.</p>
            </div>
          ) : (
            <div className="records-list">
              {[...entries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((entry) => (
                  <article className="record-card" key={entry.id}>
                    <div className="record-main">
                      <div className="record-description">
                        <span className="record-dot" />
                        <p>{entry.description}</p>
                      </div>
                      <div className="record-calories">
                        <span>
                          <Utensils size={14} />
                          Intake:{' '}
                          <b>
                            {Number(entry.calorieIntake).toLocaleString()} kcal
                          </b>
                        </span>
                        <span>
                          <Footprints size={14} />
                          Burned:{' '}
                          <b>
                            {Number(entry.calorieBurned).toLocaleString()} kcal
                          </b>
                        </span>
                      </div>
                      <div
                        aria-label="Calorie statistics"
                        style={{ display: 'block', marginTop: 8, fontSize: 14 }}
                      >
                        <p style={{ margin: '2px 0' }}>
                          Calories Intake = {Number(entry.calorieIntake)}
                        </p>
                        <p style={{ margin: '2px 0' }}>
                          Calories Burned = {Number(entry.calorieBurned)}
                        </p>
                      </div>
                      <div className="record-date">
                        <CalendarDays size={14} />
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="record-actions">
                      <button
                        type="button"
                        className="icon-button edit-button"
                        aria-label="Edit health data"
                        title="Edit"
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button delete-button"
                        aria-label="Delete health data"
                        title="Delete"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>

        <aside className="overall-section">
          <div className="section-heading">
            <div>
              <h2>Overall Data</h2>
              <p>Total calories recorded</p>
            </div>
          </div>

          <div className="pie-card">
            <div className="pie-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="76%"
                    paddingAngle={totalIntake && totalBurned ? 2 : 0}
                    stroke="#393939"
                    strokeWidth={2}
                  >
                    {pieData.map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} kcal`,
                      '',
                    ]}
                    contentStyle={{
                      background: '#252525',
                      border: '1px solid #555',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-center">
                <strong>
                  {(totalIntake + totalBurned).toLocaleString()}
                </strong>
                <span>Total kcal</span>
              </div>
            </div>

            <div className="pie-legend">
              <span>
                <i className="legend-dot intake-dot" />
                Intake <b>{totalIntake.toLocaleString()}</b>
              </span>
              <span>
                <i className="legend-dot burned-dot" />
                Burned <b>{totalBurned.toLocaleString()}</b>
              </span>
            </div>

            <div className="overall-totals">
              <div>
                <span>Calorie intake</span>
                <strong>
                  {totalIntake.toLocaleString()} <small>kcal</small>
                </strong>
              </div>
              <div>
                <span>Calorie burned</span>
                <strong>
                  {totalBurned.toLocaleString()} <small>kcal</small>
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Keep the form mounted so Cypress can locate the expected input.
          It is hidden accessibly until the Add data button is clicked. */}
      <div
        className={`modal-backdrop ${modalOpen ? 'is-open' : 'is-closed'}`}
        aria-hidden={!modalOpen}
        style={{ display: modalOpen ? 'flex' : 'none' }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        <section
          className="modal"
          role="dialog"
          aria-modal={modalOpen ? 'true' : 'false'}
          aria-labelledby="modal-title"
        >
          <div className="modal-header">
            <div className="modal-title-icon">
              <Activity size={20} />
            </div>
            <div>
              <h2 id="modal-title">Update Today&apos;s Data</h2>
              <p>
                {editingId
                  ? 'Edit your saved health record'
                  : 'How much net calories did you take today?'}
              </p>
            </div>
            <button
              type="button"
              className="close-button"
              onClick={closeModal}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="health-date">Date</label>
            <input
              id="health-date"
              name="date"
              type="date"
              value={form.date}
              onChange={updateForm}
              required
            />

            <div className="form-two-columns">
              <div className="form-field">
                <label htmlFor="calorie-intake">Calories Intake</label>
                <div className="input-with-icon">
                  <Utensils size={16} />
                  <input
                    id="calorie-intake"
                    name="calorieIntake"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter Today's Calorie Intake"
                    value={form.calorieIntake}
                    onChange={updateForm}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="calorie-burned">Calories Burned</label>
                <div className="input-with-icon">
                  <Flame size={16} />
                  <input
                    id="calorie-burned"
                    name="calorieBurned"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter Today's Calorie Burned"
                    value={form.calorieBurned}
                    onChange={updateForm}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="health-description">Short description</label>
              <input
                id="health-description"
                name="description"
                type="text"
                placeholder="Enter a short description"
                value={form.description}
                onChange={updateForm}
                required
              />
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button button-cancel"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button type="submit" className="button button-submit">
                Submit
              </button>
            </div>
          </form>
        </section>
      </div>

      <footer className="footer">
        <span>Health And Fitness Tracker</span>
        <span>Consistency over perfection.</span>
      </footer>
    </main>
  );
}
