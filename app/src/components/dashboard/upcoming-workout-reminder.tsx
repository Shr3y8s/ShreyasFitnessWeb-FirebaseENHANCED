"use client";

import { Calendar, MapPin, Info, CheckSquare, Target, Dumbbell } from 'lucide-react';

type SessionType = 'training' | 'checkin' | 'onboarding';

interface Workout {
  sessionType: SessionType;
  date: string;
  time: string;
  location: string;
}

interface UpcomingWorkoutReminderProps {
  workout: Workout;
}

const SESSION_CONFIG = {
  training: {
    title: "Upcoming In-Person Training",
    description: "Don't forget your next session is just around the corner.",
    icon: Dumbbell,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-500",
    reminders: [
      "Water bottle to stay hydrated",
      "Towel for your workout",
      "Proper workout shoes"
    ]
  },
  checkin: {
    title: "Upcoming Weekly Check-in",
    description: "Your weekly coaching call is coming up.",
    icon: CheckSquare,
    iconBg: "bg-green-500/20",
    iconColor: "text-green-500",
    reminders: [
      "Stable internet connection",
      "Quiet, private space",
      "Questions or updates ready to discuss"
    ]
  },
  onboarding: {
    title: "Upcoming Onboarding Call",
    description: "Your initial consultation call is scheduled.",
    icon: Target,
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-500",
    reminders: [
      "Stable internet connection",
      "Quiet, private space",
      "Your fitness goals and questions ready"
    ]
  }
};

export function UpcomingWorkoutReminder({ workout }: UpcomingWorkoutReminderProps) {
  const config = SESSION_CONFIG[workout.sessionType];
  const IconComponent = config.icon;
  
  return (
    <>
      <div className="flex p-4 sm:p-6 flex-row gap-3 sm:gap-4 items-center">
        <div className={`p-2.5 sm:p-3 ${config.iconBg} rounded-full shrink-0`}>
          <IconComponent className={`${config.iconColor} w-5 h-5 sm:w-6 sm:h-6`} />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold leading-none tracking-tight">
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-6 pt-0 space-y-4 pl-4 sm:pl-20 pb-4 flex-1 flex flex-col justify-center">

        <div className="space-y-2">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {workout.time ? `${workout.date} at ${workout.time}` : workout.date}
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{workout.location}</span>
          </div>
        </div>
        <div className="h-[1px] w-full my-2 bg-primary/30"></div>
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm text-primary">
            <Info className="h-4 w-4" />
            Don&apos;t Forget
          </h4>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            {config.reminders.map((reminder, index) => (
              <li key={index}>{reminder}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
