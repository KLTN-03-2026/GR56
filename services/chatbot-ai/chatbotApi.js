import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

class ChatbotAPI {
  /**
   * Send message to chatbot
   * @param {string} message - User message
   * @param {Array} history - Conversation history [{role, content}]
   * @returns {Promise} Response with foods and AI text
   */
  async sendMessage(message, history = []) {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: message,
        history: history,
      });
      return response.data;
    } catch (error) {
      console.error("Chatbot API Error:", error);
      throw error;
    }
  }

  /**
   * Get all food categories
   * @returns {Promise} List of categories with food count
   */
  async getCategories() {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      return response.data.categories;
    } catch (error) {
      console.error("Categories API Error:", error);
      throw error;
    }
  }

  /**
   * Get restaurant list with ratings
   * @param {number} limit - Max number of restaurants to return
   * @returns {Promise} List of restaurants with rating info
   */
  async getRestaurants(limit = 20) {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants`, {
        params: { limit },
      });
      return response.data.restaurants;
    } catch (error) {
      console.error("Restaurants API Error:", error);
      throw error;
    }
  }

  /**
   * Check API health
   * @returns {Promise} Health status with version and DB info
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error("Health Check Error:", error);
      throw error;
    }
  }
}

export default new ChatbotAPI();
