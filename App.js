import React, { useState, useEffect, useRef } from 'react';
import { Text, View, AppState } from 'react-native';
import { Accelerometer } from 'expo-sensors';

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { bgTask } from './BackgroundTask';

import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: ...']); // Ignore log notification by message
LogBox.ignoreAllLogs();//Ignore all log notifications

TaskManager.defineTask("bgTask", () => {
  try {
    console.log("in bg task");
    bgTask(); 
  } catch (e) {
    console.log("e", e);
  }
});
async function registerBackgroundFetchAsync()  {
  return BackgroundFetch.registerTaskAsync("bgTask", {
    minimumInterval: 1, // 15 minutes
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}
const ACTIVITY_THRESHOLD = 1.05;

const getActivityStatus = (acceleration) => {
  const magnitude = Number(Math.sqrt(
    Math.pow(acceleration.x, 2) + Math.pow(acceleration.y, 2) + Math.pow(acceleration.z, 2)
  ).toFixed(2));
  if ((magnitude)) {
    if (magnitude < ACTIVITY_THRESHOLD) {
      return 'Stopped';
    } else if (magnitude < ACTIVITY_THRESHOLD + 1) {
      return 'Walking';
    } else {
      return 'Running';
    }
  }

};

const App = () => {
  const [data, setData] = useState({});
  const appState = useRef(AppState.currentState);

  const handleAppStateChange = (nextAppState) => {
    console.log({ nextAppState });
    registerSensors();
    appState.current = nextAppState;
  };

  const registerSensors = async () => {
    try {
      const isAvailable = await Accelerometer.isAvailableAsync();
      console.log({ isAvailable });
      if (isAvailable) {
        Accelerometer.setUpdateInterval(1000);

        const subscription = Accelerometer.addListener((accelerometerData) => {
          console.log("Accelerometer listener callback");
          setData(accelerometerData);
        });

        return () => {
          subscription.remove();
        };
      } else {
        console.error('Accelerometer is not available on this device.');
      }
    } catch (error) {
      console.error('Error accessing Accelerometer data:', error.message);
    }
  };

  useEffect(() => {
    (async () => {
      await registerBackgroundFetchAsync();

      // Register sensors when the component mounts
      const cleanup = registerSensors();

      // Subscribe to app state changes
      AppState.addEventListener('change', handleAppStateChange);

      return () => {
        // Cleanup when the component unmounts
        cleanup();
        AppState.removeEventListener('change', handleAppStateChange);
      };
    })();

  }, []);

  const activityStatus = getActivityStatus(data);
  console.log({ activityStatus });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{`Activity: ${activityStatus}`}</Text>
    </View>
  );
};

export default App;
