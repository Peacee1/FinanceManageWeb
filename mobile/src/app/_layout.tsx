import React from 'react';
import {Stack} from 'expo-router';
import MobileProvider from '../../App';
export default function RootLayout(){return <MobileProvider><Stack screenOptions={{headerShown:false,animation:'none'}}/></MobileProvider>;}
