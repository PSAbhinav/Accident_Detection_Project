import React, { useEffect, useState } from 'react';
import { Text, View, Alert } from 'react-native';
import { accelerometer } from 'react-native-sensors';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';

const App = () => {
    const [location, setLocation] = useState(null);
    const [accidentDetected, setAccidentDetected] = useState(false);

    useEffect(() => {
        const accelSubscription = accelerometer.subscribe(({ x, y, z }) => {
            // Simple accident detection logic based on high acceleration
            if (Math.abs(x) > 30 || Math.abs(y) > 30 || Math.abs(z) > 30) {
                setAccidentDetected(true);
                getLocation();
            }
        });

        return () => {
            accelSubscription.unsubscribe();
        };
    }, []);

    const getLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                sendAccidentReport(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                Alert.alert("Error getting location", error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    const sendAccidentReport = (lat, lng) => {
        axios.post('http://localhost:3000/accident', {
            location: { lat, lng },
            time: new Date().toISOString(),
        }).then(response => {
            Alert.alert("Accident Reported", "The nearest hospital and police have been notified.");
        }).catch(err => {
            console.log('Error reporting accident:', err);
        });
    };

    return (
        <View style={{ padding: 50 }}>
            <Text>Accident Detection App</Text>
            {accidentDetected && location && (
                <Text>Accident detected at Lat: {location.latitude}, Lng: {location.longitude}</Text>
            )}
        </View>
    );
};

export default App;
