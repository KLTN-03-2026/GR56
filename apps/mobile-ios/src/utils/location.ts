import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    if (status === 'granted') return true;
    if (status === 'denied' || status === 'disabled') {
      Alert.alert(
        'Cần quyền vị trí',
        'Vui lòng vào Cài đặt > FoodVip > Vị trí để bật quyền truy cập vị trí.',
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return false;
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'FoodVip cần vị trí',
        message: 'Cho phép FoodVip truy cập vị trí để tìm quán gần bạn',
        buttonPositive: 'Đồng ý',
        buttonNegative: 'Từ chối',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
};
