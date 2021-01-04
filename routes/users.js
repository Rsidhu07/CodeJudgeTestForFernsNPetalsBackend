const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/user');
const { response } = require('../app');
const { route } = require('.');


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/api/v1/driver/register/', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail().not().isEmpty(),
  check('phone_number', 'Please enter a valid phone number').isMobilePhone()
  .isLength({ min: 10, max: 10}).not().isEmpty(),
  check('license_number', 'Please enter a valid license number').not().isEmpty(),
  check('car_number', 'Please enter a valid car_number').not().isEmpty()
]  , async (req,res, next) => { 

  const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()});
    }

    const { name, email, phone_number, license_number, car_number } = req.body;

    try{

      let user = await User.findOne({

        $or: [
          
          {email},
          { phone_number },
          {car_number},
          {license_number}

        ]
        
      });

      if(user){
          return res.status(400).json({ msg: 'User already exists with the provided information' });
      }

      user = new User({

        name,
        email,
        phone_number,
        license_number,
        car_number

      });

     const result =  await user.save();

     console.log('result is =======>>>>', result);

      return res.status(201).json(result);



    } 
    
    catch(error){

      console.error(error.message);
      res.status(500).send('Server Error');

    }

});

router.post('/api/v1/driver/:id/sendLocation/', 
  [
    check('latitude', 'Please enter a valid Latitude').isDecimal().not().isEmpty(),
    check('longitude', 'Please enter a valid Longitude').isDecimal().not().isEmpty()
  ],

  async(req, res, next) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array()});
    }
    const id = req.params.id;

    console.log('param id is =========>>', id);
    try {
      
      let user = await User.findOne({

        _id : id
  
      });
  
      if(!user){
        return res.status(400).json({ msg: 'User does not exist with the provided id! '});
      }
  
      const { latitude, longitude } = req.body;

      console.log("latitude and longitude is ======>>>>>>>>>>>>>>", latitude, longitude);
  
      user = await User.findOneAndUpdate(
      
        {_id : id},
  
        [
          {$set: 
      
            {
                "current_location": [
                                        { "latitude ": parseFloat(latitude), 
                                         "longitude": parseFloat(longitude)
                                        }                                  
                                      ]
            }
          }
        ],
  
        { returnNewDocument: true }
        
      );
  
      return res.status(202).send({ 'status' : 'success in updating location'});

    } catch (error) {

      console.error(error.message);
      res.status(500).send('Server Error');
    
    }
    
    

  });

  router.post('/api/v1/passenger/available_cabs/', 
  [ check('latitude', 'Please enter a valid customer latitude').not().isEmpty(),
    check('longitude','Please enter a valid customer longitude').not().isEmpty()
  ], 
    async (req, res, next) =>{

      const errors = validationResult(req);

      if(!errors.isEmpty()){
        res.status(400).json({errors: errors.array()});
      }

      try {
      
        /* const users = await User.find({

          current_location: { $exists: true , $ne: []}

        }); */

        const users = await User.find({current_location: { $exists: true , $ne: []}}, {current_location:1});



        // console.log('Users returned after find are ==============>>>>>>>>>>>>>>', users);

        const driverWithinLocation = [];

        for(let driverLocation of users) {

          const driverLat = driverLocation.current_location[0].latitude;
          const driverLong = driverLocation.current_location[0].longitude;
          const { latitude, longitude } = req.body ;

          const distanceBetweenPassenger = haversineDistance ([latitude, longitude],
                                           [driverLat,driverLong]) ;
      /*  console.log("distance between provided locaion is =========>>>>>>>>>",
                      latitude,longitude,driverLat,driverLong,distanceBetweenPassenger); */
          if(distanceBetweenPassenger<= 4){
            driverWithinLocation.push(driverLocation._id);
          }
        }
        
        // console.log("driver within location ==========>>>>>>>", driverWithinLocation);

        const available_cabs = [] ;

        if(driverWithinLocation && driverWithinLocation.length > 0){

          for(let id of driverWithinLocation){

            const allDriversWithinFourKmRange = await User.findOne(
           
              { _id: id }, 
             
              {
                name : 1 ,
                car_number : 1,
                phone_number: 1,
                _id: 0
              }
            
            );
    
/*             console.log("findone result of driver location ===========>>>>>>", 
                        allDriversWithinFourKmRange); */
            
            available_cabs.push(allDriversWithinFourKmRange);
  
          }

        }



        if(available_cabs && available_cabs.length > 0){

          res.status(200).send(available_cabs);

        } else {

          res.status(200).json({
            "message": "No cabs available!"
          });

        }

      } catch (error) {
        
        console.error(error.message);
        res.status(500).send('Server Error');
      }

    });

  const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
    const toRadian = angle => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(lat2, lat1);
    const dLon = distance(lon2, lon1);

    lat1 = toRadian(lat1);
    lat2 = toRadian(lat2);

    // Haversine Formula
    const a =
      Math.pow(Math.sin(dLat / 2), 2) +
      Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.asin(Math.sqrt(a));

    let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

    return finalDistance.toFixed(2);
  };


module.exports = router;
