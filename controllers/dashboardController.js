const dashboardService = require('../services/dashboardService');

const getDashboard = async (req, res) => {
   try {
      const data = await dashboardService.getDashboardData();
      
      return res.status(200).json({
         status: 'success',
         data: data
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error getting dashboard data',
         error: error.message
      });
   }
};

module.exports = {
   getDashboard
};
