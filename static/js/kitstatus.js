const SYNC_INTERVAL=750;

var IntervalID;
var latestSync = Date.now( );
globalloc = "";

function printcertificate(doc) {
	if (doc)
		$.post( "http://137.226.150.67:55665/print/cert",{ "requests[]": [ ] } );
	else
		$.post( "http://137.226.150.67:55665/print/seal",{ "requests[]": [ ] } );
}

function toggleLED(state,loc) {
	$.post( "/?ajax=1&cabinet=1&state="+state+"&location="+loc,{ "requests[]": [ ] } );
}

function init( ) {
	intervalID = window.setInterval( sync_kits,SYNC_INTERVAL );
	$.post( "/?ajax=1&scenario=kitting&order_id="+current_order_id+"&kit_id="+current_kit_id,{ "requests[]": [ ] },sync_result_funcfac( ),"json" );
	$.post( "/?ajax=1&cabinet=1&state="+3,{ "requests[]": [ ] } );
}

function tr_id( tr ) {
	return quo.find( "span.id" ).text( );
}

function writeHTML ( obj ) {
	if (obj === null)
		return "";
	return obj;
}

function new_tr( goal ) {
	var count_field;
	var rfid_field;
	var tr_class;

	if( goal.tag_id ) {
		count_field = goal.count;
		rfid_field = goal.tag_id;
		if( goal.archived=="f" ) {
			tr_class = "ready";
		}
		else
			tr_class = "final";
	} else {
		count_field = "<input type=\"text\" class=\"count\" value=\""+goal.count+"\" />";
		if( goal.count==goal.target )
			rfid_field = "<input type=\"button\" value=\"Label Zuweisung\" />";
		else
			rfid_field = "<input type=\"button\" disabled=\"disabled\" value=\"Label Zuweisung\" />";
		tr_class = ""
	}

	//result = $( "<tr class=\""+tr_class+"\"><td><span class=\"id\">"+goal.id+"</span><span>"+goal.description+"</span></td><td>"+goal.inventory+"</td><td>"+goal.target+"</td><td>"+count_field+"</td><td>"+rfid_field+"</td></tr>" );

	result = $( "<tr class=\""+tr_class+"\"><td class=\"left\"><span class=\"id\">"+goal.id+"</span><span>"+goal.description+"</span></td><td>"+writeHTML(goal.pn)+"</td><td>"+writeHTML(goal.sn)+"</td><td>"+writeHTML(goal.weight)+"</td><td>"+goal.inventory+"</td><td>"+goal.target+"</td><td>"+count_field+"</td><td>"+writeHTML(goal.location)+"</td><td>"+rfid_field+"</td><td><span class=\"printcertificate glyphicon glyphicon-list-alt\" aria-hidden=\"true\"></span></td></tr>" );

	result.find( "input" ).click( function( e ) { $( e.target ).data( "requested",true ); } );

	return result;
}

function sync_result_funcfac( ) {
	timestamp = Date.now( );
	return function( data,textStatus,xhr ) {
		if( timestamp>latestSync ) {
/* Iterate over all rows: For each row make sure it reflects the desired data. Normally we could just replace everything by the current situation BUT in the situation were there is an input and we're permitting an input. */
			var i = 0;
			var kittable = $( "#kittable" );
			while( i<data.length || i<kittable.find( "tr" ).length ) {
				trs = kittable.children( );

				if( data.length<i+1 ) {
					trs[ i ].remove( );
				} else if( trs.length<i+1 ) {
					kittable.append( new_tr( data[ i ] ) );

					i++;
				} else {
					goal = data[ i ];
					quo = trs.eq( i );
					quo_id = tr_id( quo );

					// Check whether the row is somewhere else. If yes, move it here, if no, create it.
					if( goal.id!=quo_id ) {
						var moved = false;
						for( var j = i; j<trs.length; j++ ) {
							if( tr_id( trs.eq( j ) )==goal.id ) {
								trs.eq( j ).insertAfter( trs.eq( i-1 ) );
								moved = true;
								break;
							}
						}

						if( !moved ) {
							trs.eq( i-1 ).after( new_tr( goal ) );
						}

					}

					// Update properties. If count does not agree with data from base, override it only if the count is found to be unreachable from current inventory. Otherwise, the next request should hopefully return an agreeable datum
					var quo_tagged = quo.find( "input.count" ).length==0;
					var tr = trs.eq( i );
					if( goal.tag_id || quo_tagged ) {
						trs.eq( i ).replaceWith( new_tr( goal ) );
					} else {
						// Was not, is not locked, update. The only reason why we're not just blindly replacing all sits right here
						children = tr.children( );

						children.eq( 0 ).children( ).eq( 1 ).text( goal.description );
						children.eq( 1 ).text( writeHTML(goal.pn) );
						children.eq( 2 ).text( writeHTML(goal.sn) );
						children.eq( 3 ).text( writeHTML(goal.weight) );
						children.eq( 7 ).text( writeHTML(goal.location) );
						children.eq( 4 ).text( goal.inventory );
						children.eq( 5 ).text( goal.target );
						if( children.eq( 6 ).find( "input" ).val( )!=goal.count ) {
							var is = parseInt( children.eq( 6 ).find( "input" ).val( ) );
							var should = parseInt( goal.count );
							var has = parseInt( goal.inventory );

							if( is-should > has )
								children.eq( 6 ).find( "input" ).val( should );

						}
						children.eq( 8 ).find( "input" ).eq( 0 ).prop( "disabled",children.eq( 6 ).find( "input" ).val( )!=goal.target );

					}

					i++;
				}
			}
		}
	};
}

function sync_kits( ) {
	var request_array =[ ];

	var trs = $( "#kittable" ).children( );

	var status2 = false;
	var status3 = false;
	var statusf = 0;
  var loclist = "";

	for( var i = 0; i<trs.length; i++ ) {
		request_obj = {
            "id":parseInt( trs.eq( i ).children( ).eq( 0 ).children( ).eq( 0 ).text( ) ),
			"value":parseInt( trs.eq( i ).children( ).eq( 6 ).find( "input" ).val( ) ),
			"tag":trs.eq( i ).children( ).eq( 8 ).find( "input" ).data( "requested" )==true,
			"status": -1
		};
		request_array.push( JSON.stringify( request_obj ) );

		if (($(trs.eq( i )).attr("class")=="ready")) {status2=true;}
		if ($(trs.eq( i )).attr("class")=="final") {status3=true;}

        var Llocation = trs.eq( i ).children( ).eq( 7 ).text( );
        var Ltargetval = parseInt( trs.eq( i ).children( ).eq( 5 ).text( ) );
        var Lval = parseInt( trs.eq( i ).children( ).eq( 6 ).find( "input" ).val( ) );

        if (Lval < Ltargetval)
            loclist += Llocation+"-";
	}

	if (globalloc != loclist) {
		globalloc = loclist;
		toggleLED(1,globalloc);
	}

		if ((trs.length>0)) {

			if (status3) {
				statusf = 2;
				$( ".breadcrumb" ).children().children().eq(0).addClass("active").removeClass("animate");
				$( ".breadcrumb" ).children().children().eq(1).addClass("active").removeClass("animate");
				$( ".breadcrumb" ).children().children().eq(2).addClass("active").addClass("animate");
				$( ".next" ).fadeIn("fast");
			} else if (status2) {
				statusf = 1;

				$( ".breadcrumb" ).children().children().eq(2).removeClass("active").removeClass("animate");
				$( ".breadcrumb" ).children().children().eq(1).addClass("active").addClass("animate");
				$( ".breadcrumb" ).children().children().eq(0).addClass("active").removeClass("animate");
			} else {
				$( ".breadcrumb" ).children().children().eq(2).removeClass("active").removeClass("animate");
				$( ".breadcrumb" ).children().children().eq(1).removeClass("active").removeClass("animate");
				$( ".breadcrumb" ).children().children().eq(0).addClass("active").addClass("animate");
			}

			request_obj = {
				"id":"",
				"value":"",
				"tag":"",
				"status": statusf
			};
			request_array.push( JSON.stringify( request_obj ) );

		}

	$.post( "/?ajax=1&scenario=kitting&order_id="+current_order_id+"&kit_id="+current_kit_id,{ "requests[]": request_array },sync_result_funcfac( ),"json" );
}

function timer() {
	var i = 3;
	var t = setInterval(function(){
						$(".timer").text("("+i+")");
						i--;
					}, 1000);

	setTimeout(function(){
		$(".timer").text("");
		clearInterval(t);
		$(".timer").parent().click();
	},4000);

}
$(document).on('click', '.kitdocumentation', function () {
	timer();
});


$(document).on('click', '.printcertificate', function () {
	$(".message").html("<div class=\"alert alert-info\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>Das Zertifikat wurde ausgedruckt.</div>").hide().fadeIn("fast");
	printcertificate(1);
});

$(document).on('click', '.kitseal', function () {
	$(".message").html("<div class=\"alert alert-success\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>Vollständigkeitssiegel wurde ausgedruckt.</div>").hide().fadeIn("fast");
	printcertificate(0);
});

$(document).on('click', '.close', function () {
	$(this).parent().fadeOut("fast", function() {
		$(this).remove();
	});
});

$( init );
