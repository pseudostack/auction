// Required packages
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Return the auction page
app.get('/auction', function(req,res){
  res.sendFile(__dirname + '/auction.html');
});

// Return the bidder page
app.get('/bidder', function(req,res){
  res.sendFile(__dirname + '/bidder.html');
});

// Variables for storing auction info
var item_desc;
var item_start_bid;
var top_bidder_name;

//boolean to keep track of whether auction is in progress or not
var auction_in_progress;

//This function is used for starting our timer and sending the timer data
// to the clients
function startTimer()
{
var time_function = setInterval(function()
  {
    console.log("Timer function called and timer is :" + auction_timer);

    //only emit and decrement the time when it hasn't reached 0
    if (auction_timer > 0)
    {
          io.emit("timer",{timer: auction_timer});
          auction_timer = auction_timer -1 ;
        }
    //otherwise end the timer and call our function to end the auction
    else {
      clearInterval(time_function);
      endAuction();
    }
  }, 1000);
};

//this function is used for resseting our variables for a new auction
function resetAuction()
{
  auction_in_progress = false;
  auction_timer = 30;
  item_desc='';
  item_start_bid='';
  top_bidder_name='starting bid';
}

//this function is called when the auction is ended
function endAuction()
{
  //emit to the clients that the auction has ended
  io.emit("auction_complete", {});
}

// If we have a connection....
io.on('connection', function(socket){

  //if a hello connection (made when clients first connect)
  socket.on("hello", function()
  {
    // log it in console
    console.log("New Bidder joined!");

    // send back an ack with auction details... including whether an auction_timer
    //is in progress or not.
    socket.emit("ack",{'auction_in_progress': auction_in_progress,
                      bid_price: item_start_bid,
                      bidder_name: top_bidder_name,
                      item_desc: item_desc});
  });

//once an auction has started
  socket.on("start_auction", function(aucdata)
  {
      //start by resetting our data
      resetAuction();

        //assign collected data to our variables
        item_desc = aucdata.item_desc;
        item_start_bid = aucdata.start_bid_price;

        //set our auction in progress boolean to true
        auction_in_progress = true;

    // log the auction data
    console.log("Auction initiated: " + JSON.stringify(aucdata));

    // Broadcast the auctiond etails to all the bidders
    socket.broadcast.emit("startauction", {item_desc: item_desc, bid_price: item_start_bid});

    //and start the timer!
    startTimer();
  });

//once a bid has been received
  socket.on("bid", function(bid_data){

    //log the bid data
    console.log(bid_data.bid_price + " Bid received from " + bid_data.bidder_name)

    //log the current bid price
    console.log("current bid is: " + item_start_bid);

    //if the new bid is higher than the current or start bid
    if (parseInt(bid_data.bid_price) >  item_start_bid)
    {
      //assign bid price and bidder name to our variables
      item_start_bid = bid_data.bid_price;
      top_bidder_name = bid_data.bidder_name;

      //log confirmation of new bid
      console.log("new bid " + bid_data.bid_price+ " from " + bid_data.bidder_name + " being recorded");

    //send new bid amount and bidder name to all clients
    io.emit("bid_data",
                          {bid_price: bid_data.bid_price,
                           bidder_name: bid_data.bidder_name});
  }
  });
});

// Start the server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
