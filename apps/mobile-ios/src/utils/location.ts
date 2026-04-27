import { PermissionsAndroid, Platform } from 'react-native';

export const requestLocationPermission = async () => {
  if (Platform.OS !== 'android') return true;

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
