import { useMemo, useState } from 'react';

type Inquiry = {
  id: string;
  customerName?: string;
  customer?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  reminderAt?: string | null;
};

type DashboardCalendarProps = {
  inquiries: Inquiry[];
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);

  // Convert Sunday = 0 into Monday = 0
  const startingDay = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: Array<Date | null> = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function getCustomerName(inquiry: Inquiry) {
  if (inquiry.customerName) {
    return inquiry.customerName;
  }

  if (inquiry.customer?.name) {
    return inquiry.customer.name;
  }

  const firstName = inquiry.customer?.firstName || '';
  const lastName = inquiry.customer?.lastName || '';

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Customer';
}

export function DashboardCalendar({
  inquiries,
}: DashboardCalendarProps) {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(
    getDateKey(today)
  );

  const calendarDays = useMemo(
    () =>
      getMonthDays(
        currentDate.getFullYear(),
        currentDate.getMonth()
      ),
    [currentDate]
  );

  const remindersByDate = useMemo(() => {
    const grouped: Record<string, Inquiry[]> = {};

    inquiries.forEach((inquiry) => {
      if (!inquiry.reminderAt) {
        return;
      }

      const reminderDate = new Date(inquiry.reminderAt);

      if (Number.isNaN(reminderDate.getTime())) {
        return;
      }

      const dateKey = getDateKey(reminderDate);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(inquiry);
    });

    return grouped;
  }, [inquiries]);

  const selectedReminders =
    remindersByDate[selectedDate] || [];

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    setSelectedDate(getDateKey(now));
  };

  const formatReminderTime = (reminderAt: string) => {
    const date = new Date(reminderAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatSelectedDate = () => {
    const date = new Date(`${selectedDate}T00:00:00`);

    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openInquiry = (inquiryId: string) => {
    window.location.href = `/inquiries/${inquiryId}`;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Calendar
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Scheduled inquiry reminders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Today
          </button>

          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-4 text-center">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {MONTHS[currentDate.getMonth()]}{' '}
          {currentDate.getFullYear()}
        </h3>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[72px] border-b border-r border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
              />
            );
          }

          const dateKey = getDateKey(date);
          const reminders = remindersByDate[dateKey] || [];

          const isToday =
            dateKey === getDateKey(today);

          const isSelected =
            dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              className={`relative min-h-[72px] border-b border-r border-slate-200 p-2 text-left transition dark:border-slate-700 ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {date.getDate()}
              </div>

              {reminders.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />

                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    {reminders.length}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatSelectedDate()}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedReminders.length === 1
                ? '1 scheduled reminder'
                : `${selectedReminders.length} scheduled reminders`}
            </p>
          </div>
        </div>

        {selectedReminders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-600">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No scheduled reminders for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedReminders.map((inquiry) => (
              <button
                key={inquiry.id}
                type="button"
                onClick={() => openInquiry(inquiry.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {getCustomerName(inquiry)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Inquiry #{inquiry.id}
                  </p>
                </div>

                <span className="ml-3 shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">
                  {inquiry.reminderAt
                    ? formatReminderTime(
                        inquiry.reminderAt
                      )
                    : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default DashboardCalendar;