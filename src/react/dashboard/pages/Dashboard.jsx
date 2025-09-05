import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Import dashboard widgets
const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    metrics: {
      sessionsCompleted: 12,
      weeksActive: 8,
      strengthGained: '15lb'
    },
    currentPlan: {
      name: 'Strength Building Program',
      remainingWeeks: 4,
      focus: 'Building Strength & Endurance',
      frequency: '3 sessions per week',
      progress: 60
    },
    upcomingSessions: [
      {
        id: 1,
        day: 15,
        month: 'Jul',
        title: 'Upper Body Strength',
        time: '2:00 PM - 3:00 PM',
        type: 'In-Person'
      },
      {
        id: 2,
        day: 17,
        month: 'Jul',
        title: 'Full Body HIIT',
        time: '10:00 AM - 11:00 AM',
        type: 'Remote'
      },
      {
        id: 3,
        day: 19,
        month: 'Jul',
        title: 'Lower Body Focus',
        time: '3:30 PM - 4:30 PM',
        type: 'In-Person'
      }
    ],
    completedSessions: [
      { date: 'Jul 12', workout: 'Lower Body Power', duration: '60 min' },
      { date: 'Jul 10', workout: 'Cardio & Core', duration: '45 min' },
      { date: 'Jul 8', workout: 'Upper Body Strength', duration: '60 min' },
      { date: 'Jul 5', workout: 'Full Body HIIT', duration: '45 min' },
      { date: 'Jul 3', workout: 'Active Recovery', duration: '30 min' }
    ],
    progressMetrics: {
      weight: { current: 165, change: -5, unit: 'lbs' },
      bodyFat: { current: 18, change: -2, unit: '%' }
    }
  });

  useEffect(() => {
    // In a real implementation, we would fetch data from Firestore here
    // For now, we're using the mock data defined above
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [currentUser?.uid]);

  const pageStyles = {
    padding: '20px 0'
  };

  const sectionTitleStyles = {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#333'
  };

  const dashboardGridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '25px',
    marginTop: '25px'
  };

  const overviewStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '25px'
  };

  // Loading state
  if (isLoading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div style={pageStyles}>
      <h1 style={sectionTitleStyles}>Your Fitness Dashboard</h1>
      
      {/* Overview Metrics */}
      <div style={overviewStyles} className="overview-metrics">
        <OverviewCard 
          icon="📊" 
          value={dashboardData.metrics.sessionsCompleted} 
          label="Sessions Completed"
        />
        <OverviewCard 
          icon="📅" 
          value={dashboardData.metrics.weeksActive} 
          label="Weeks Active"
        />
        <OverviewCard 
          icon="💪" 
          value={dashboardData.metrics.strengthGained} 
          label="Strength Gained"
        />
      </div>
      
      {/* Main Dashboard Grid */}
      <div style={dashboardGridStyles} className="dashboard-grid">
        {/* Current Plan Widget */}
        <DashboardCard title="Current Plan">
          <CurrentPlan plan={dashboardData.currentPlan} />
        </DashboardCard>
        
        {/* Progress Tracking Widget */}
        <DashboardCard title="Progress Tracking">
          <ProgressTracking metrics={dashboardData.progressMetrics} />
        </DashboardCard>
        
        {/* Upcoming Sessions Widget */}
        <DashboardCard title="Upcoming Sessions">
          <UpcomingSessions sessions={dashboardData.upcomingSessions} />
        </DashboardCard>
        
        {/* Completed Sessions Widget */}
        <DashboardCard title="Completed Sessions">
          <CompletedSessions sessions={dashboardData.completedSessions} />
        </DashboardCard>
      </div>
    </div>
  );
};

// Reusable overview card component
const OverviewCard = ({ icon, value, label }) => {
  const cardStyles = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
    height: '100px'
  };

  const iconStyles = {
    fontSize: '28px',
    backgroundColor: '#f0f9f0',
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#4CAF50'
  };

  const valueStyles = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  };

  const labelStyles = {
    color: '#666',
    fontSize: '14px'
  };

  return (
    <div style={cardStyles} className="overview-card">
      <div style={iconStyles}>{icon}</div>
      <div>
        <div style={valueStyles}>{value}</div>
        <div style={labelStyles}>{label}</div>
      </div>
    </div>
  );
};

// Reusable dashboard card component
const DashboardCard = ({ title, children }) => {
  const cardStyles = {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyles = {
    backgroundColor: '#f8f9fa',
    padding: '15px 20px',
    borderBottom: '1px solid #eee'
  };

  const titleStyles = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  };

  const contentStyles = {
    padding: '20px',
    flex: 1,
    overflowY: 'auto'
  };

  return (
    <div style={cardStyles} className="dashboard-card">
      <div style={headerStyles}>
        <h3 style={titleStyles}>{title}</h3>
      </div>
      <div style={contentStyles}>
        {children}
      </div>
    </div>
  );
};

// Current Plan widget component
const CurrentPlan = ({ plan }) => {
  const planInfoStyles = {
    marginBottom: '15px'
  };

  const planTitleStyles = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '5px'
  };

  const remainingWeeksStyles = {
    color: '#666',
    fontSize: '14px',
    marginBottom: '15px'
  };

  const detailItemStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  };

  const detailLabelStyles = {
    color: '#666'
  };

  const detailValueStyles = {
    fontWeight: '500',
    color: '#333'
  };

  const progressContainerStyles = {
    marginTop: '20px'
  };

  const progressLabelContainerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px'
  };

  const progressBarStyles = {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const progressFillStyles = {
    height: '100%',
    width: `${plan.progress}%`,
    backgroundColor: '#4CAF50',
    borderRadius: '4px'
  };

  const buttonStyles = {
    display: 'inline-block',
    backgroundColor: 'transparent',
    border: '1px solid #4CAF50',
    color: '#4CAF50',
    padding: '8px 16px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  };

  return (
    <div>
      <div style={planInfoStyles}>
        <h4 style={planTitleStyles}>{plan.name}</h4>
        <p style={remainingWeeksStyles}>{plan.remainingWeeks} weeks remaining</p>
        
        <div style={detailItemStyles}>
          <span style={detailLabelStyles}>Focus:</span>
          <span style={detailValueStyles}>{plan.focus}</span>
        </div>
        
        <div style={detailItemStyles}>
          <span style={detailLabelStyles}>Frequency:</span>
          <span style={detailValueStyles}>{plan.frequency}</span>
        </div>
      </div>
      
      <div style={progressContainerStyles}>
        <div style={progressLabelContainerStyles}>
          <span>Program Progress</span>
          <span>{plan.progress}%</span>
        </div>
        <div style={progressBarStyles}>
          <div style={progressFillStyles}></div>
        </div>
      </div>
      
      <button style={buttonStyles}>View Full Program</button>
    </div>
  );
};

// Progress Tracking widget component
const ProgressTracking = ({ metrics }) => {
  const metricsGridStyles = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  };

  const metricCardStyles = {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  };

  const metricTitleStyles = {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333'
  };

  const chartPlaceholderStyles = {
    height: '100px',
    backgroundColor: '#eee',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    marginBottom: '15px'
  };

  const metricSummaryStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const metricValueStyles = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  };

  const metricChangeStyles = {
    fontSize: '14px',
    fontWeight: '500',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: '#4CAF50'
  };

  const buttonStyles = {
    display: 'block',
    width: '100%',
    backgroundColor: 'transparent',
    border: '1px solid #4CAF50',
    color: '#4CAF50',
    padding: '8px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  };

  return (
    <div>
      <div style={metricsGridStyles}>
        {/* Weight Metric */}
        <div style={metricCardStyles}>
          <h4 style={metricTitleStyles}>Weight</h4>
          <div style={chartPlaceholderStyles}>
            <span>📊 Chart</span>
          </div>
          <div style={metricSummaryStyles}>
            <div style={metricValueStyles}>
              {metrics.weight.current} {metrics.weight.unit}
            </div>
            <div style={metricChangeStyles}>
              {metrics.weight.change < 0 ? '' : '+'}{metrics.weight.change} {metrics.weight.unit}
            </div>
          </div>
        </div>
        
        {/* Body Fat Metric */}
        <div style={metricCardStyles}>
          <h4 style={metricTitleStyles}>Body Fat %</h4>
          <div style={chartPlaceholderStyles}>
            <span>📊 Chart</span>
          </div>
          <div style={metricSummaryStyles}>
            <div style={metricValueStyles}>
              {metrics.bodyFat.current}{metrics.bodyFat.unit}
            </div>
            <div style={metricChangeStyles}>
              {metrics.bodyFat.change < 0 ? '' : '+'}{metrics.bodyFat.change}{metrics.bodyFat.unit}
            </div>
          </div>
        </div>
      </div>
      
      <button style={buttonStyles}>View All Metrics</button>
    </div>
  );
};

// Upcoming Sessions widget component
const UpcomingSessions = ({ sessions }) => {
  const sessionItemStyles = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  };

  const sessionDateStyles = {
    width: '50px',
    height: '50px',
    backgroundColor: '#4CAF50',
    borderRadius: '8px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px'
  };

  const dateDayStyles = {
    fontSize: '18px',
    fontWeight: '600'
  };

  const dateMonthStyles = {
    fontSize: '12px'
  };

  const sessionInfoStyles = {
    flex: 1
  };

  const sessionTitleStyles = {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '5px',
    color: '#333'
  };

  const sessionTimeStyles = {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px'
  };

  const sessionTypeStyles = {
    display: 'inline-block',
    fontSize: '12px',
    padding: '3px 8px',
    backgroundColor: '#e9ecef',
    borderRadius: '12px',
    color: '#495057'
  };

  const sessionActionsStyles = {
    display: 'flex',
    gap: '10px'
  };

  const iconButtonStyles = {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#666',
    fontSize: '12px'
  };

  const buttonStyles = {
    display: 'block',
    width: '100%',
    backgroundColor: 'transparent',
    border: '1px solid #4CAF50',
    color: '#4CAF50',
    padding: '8px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  };

  return (
    <div>
      {sessions.map(session => (
        <div key={session.id} style={sessionItemStyles}>
          <div style={sessionDateStyles}>
            <div style={dateDayStyles}>{session.day}</div>
            <div style={dateMonthStyles}>{session.month}</div>
          </div>
          <div style={sessionInfoStyles}>
            <h4 style={sessionTitleStyles}>{session.title}</h4>
            <p style={sessionTimeStyles}>{session.time}</p>
            <span style={sessionTypeStyles}>{session.type}</span>
          </div>
          <div style={sessionActionsStyles}>
            <button style={iconButtonStyles} title="Reschedule Session">
              🗓️
            </button>
            <button style={iconButtonStyles} title="Cancel Session">
              ✖️
            </button>
          </div>
        </div>
      ))}
      
      <button style={buttonStyles}>Schedule New Session</button>
    </div>
  );
};

// Completed Sessions widget component
const CompletedSessions = ({ sessions }) => {
  const historyItemStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee'
  };

  const dateStyles = {
    width: '60px',
    color: '#666',
    fontSize: '14px'
  };

  const workoutStyles = {
    flex: 1,
    color: '#333',
    fontWeight: '500',
    paddingLeft: '10px',
    paddingRight: '10px'
  };

  const durationStyles = {
    width: '60px',
    color: '#666',
    fontSize: '14px',
    textAlign: 'right'
  };

  const buttonStyles = {
    display: 'block',
    width: '100%',
    backgroundColor: 'transparent',
    border: '1px solid #4CAF50',
    color: '#4CAF50',
    padding: '8px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  };

  return (
    <div>
      {sessions.map((session, index) => (
        <div key={index} style={historyItemStyles}>
          <span style={dateStyles}>{session.date}</span>
          <span style={workoutStyles}>{session.workout}</span>
          <span style={durationStyles}>{session.duration}</span>
        </div>
      ))}
      
      <button style={buttonStyles}>View All History</button>
    </div>
  );
};

export default Dashboard;
