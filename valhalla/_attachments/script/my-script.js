var app = angular.module('myApp', ['ui']);

//Trims a string so that it has no blank characters
if (!String.prototype.fulltrim) {
	String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');};
}

//Converts ISO date string to date Object
function parseDate(str) {
	// we assume str is a UTC date ending in 'Z'

	var parts = str.split('T'),
	dateParts = parts[0].split('-'),
	timeParts = parts[1].split('Z'),
	timeSubParts = timeParts[0].split(':'),
	timeSecParts = timeSubParts[2].split('.'),
	timeHours = Number(timeSubParts[0]),
	_date = new Date;

	_date.setUTCFullYear(Number(dateParts[0]));
	_date.setUTCMonth(Number(dateParts[1])-1);
	_date.setUTCDate(Number(dateParts[2]));
	_date.setUTCHours(Number(timeHours));
	_date.setUTCMinutes(Number(timeSubParts[1]));
	_date.setUTCSeconds(Number(timeSecParts[0]));
	if (timeSecParts[1]) _date.setUTCMilliseconds(Number(timeSecParts[1]));

	// by using setUTC methods the date has already been converted to local time(?)
	return _date;
}

//Converts a Date object to ISO string
if ( !Date.prototype.toISOString ) {
     
    ( function() {
     
        function pad(number) {
            var r = String(number);
            if ( r.length === 1 ) {
                r = '0' + r;
            }
            return r;
        }
  
        Date.prototype.toISOString = function() {
            return this.getUTCFullYear()
                + '-' + pad( this.getUTCMonth() + 1 )
                + '-' + pad( this.getUTCDate() )
                + 'T' + pad( this.getUTCHours() )
                + ':' + pad( this.getUTCMinutes() )
                + ':' + pad( this.getUTCSeconds() )
                + '.' + String( (this.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
                + 'Z';
        };
   
    }() );
}

var Ability = function(){
	this.icon = "images/empty-slot.png";
	this.name = "Ability Name";
	this.description = "Ability Description";
	this.base_range = 0;
};

var Talent = function(){
	this.icon = "";
	this.name = "Talent Name";
	this.description = "Talent description";
	this.subsequent = [];
	this.x = 0;
	this.y = 0;
	this.d = 32;
};

app.controller('MainCtrl', function($scope) {

	$scope.save_interval;
	$scope.user_profile;
	$scope.characters = [];
	$scope.loading = true;
	$scope.save_bool = true;
	$scope.detailed_char = null;
	$scope._rev = undefined;
	$scope.shared_inventory = [];
	$scope.changeHandler = undefined;
	$scope.x_offset = 480;
	$scope.y_offset = 480;
	
	$scope.abilities_db = new Array();
	$scope.talents_db = new Array();
	
	populate_abilities($scope.abilities_db);
	populate_talents($scope.talents_db);
	
	$scope.react_on_click = function(character){
		$scope.detailed_char = character;
		$('#champion-details-level-progress-fill').css('width',100*character.experience/(10*character.level) + '%');
		
		$('#champion-details').fadeIn(200, function(){drawTalentsInitial($scope)});
	};
	
	$(function() {
		$.fn.serializeObject = function() {
			var o = {};
			var a = this.serializeArray();
			$.each(a, function() {
				if (o[this.name]) {
					if (!o[this.name].push) {
						o[this.name] = [o[this.name]];
					}
					o[this.name].push(this.value || '');
				} else {
					o[this.name] = this.value || '';
				}
			});
			return o;
		};

		var path = unescape(document.location.pathname).split('/'),
			design = path[3],
			db = $.couch.db(path[1]);
		function getChampions() {
			if($scope.user_profile)
			{
				db.openDoc($scope.user_profile.name + $scope.user_profile.rand, {
					success : function(data) {
						$scope._rev = data._rev;
						$scope.$apply($scope.characters = data.save_data);
					},
					error : function(data){
						if(data == '404')
						{
							$scope.$apply($scope.characters = []);
							$('#champions').fadeIn(200);
							$('#index').css('display','none');
							$scope.loading = false;
							$scope.save_bool = false;
						}
					}
				});
			}
		};
		
		var changesRunning = false;
		function setupChanges(since) {
			if (!changesRunning) {
				$scope.changeHandler = db.changes(since);
				changesRunning = true;
				$scope.changeHandler.onChange(function(){$scope.loading = true; getChampions();});
			}
		}
		
		$("#account").couchLogin({
			loggedIn : function(r) {
				$("#profile").couchProfile(r, {
					profileReady : function(profile) {
						$scope.$watch('characters', function(newValue, oldValue) {
							if($scope.loading)
							{
								$scope.loading = false;
							}
							else
							{
								$scope.save_bool = false;
							}
							if(!$scope.save_bool)
							{
								$scope.save_bool = true;
								var doc = {};
								var save_data = $scope.characters;
								doc.save_data = save_data;
								doc.shared_inventory = $scope.shared_inventory;
								doc.created_at = (new Date()).toISOString();
								doc.profile = {name: profile.name, rand: profile.rand};
								doc._id = profile.name + profile.rand;
								if($scope._rev)
								{
									doc._rev = $scope._rev;
								}
								db.saveDoc(doc, {success : function(data) {$scope.save_bool = true; $scope._rev = data.rev;}});
							}
						}, true);
						
						$('#index-left').removeClass('wide').addClass('narrow');
						$('#index-right').css('display', 'inline-block');
						
						$scope.user_profile = profile;
						
						getChampions();
					}
				});
			},
			loggedOut : function() {
				$scope.user_profile = undefined;
				$scope.loading = true;
				$scope.save_bool = true;
				$scope.characters = [];
				$scope.detailed_char = null;
				$scope._rev = undefined;
				$scope.shared_inventory = [];
				if($scope.changeHandler)
				{
					$scope.changeHandler.stop();
					$scope.changeHandler = undefined;
				}
				
				$('.avatar').html('');
						
				$('#index-left').removeClass('narrow').addClass('wide');
						$('#index-right').css('display', 'none');
			}
		});
	 });
	
	/*GUI Behavior*/
	$('#create-new-champion').click(function(){
		$('#champion-select').fadeIn(200);
	});
	$('#close-champion-select').click(function(){
		$('#champion-select').fadeOut(200);
	});
	$('.close-select').click(function(){
		$(this).parent().fadeOut(200, function(){
			$('#champion-list').fadeIn(200);
		});
	});
	$('#berzerker-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#berzerker-select').fadeIn(200);
		});
	});
	$('#reaver-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#reaver-select').fadeIn(200);
		});
	});
	$('#scout-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#scout-select').fadeIn(200);
		});
	});
	$('#ranger-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#ranger-select').fadeIn(200);
		});
	});
	$('#volva-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#volva-select').fadeIn(200);
		});
	});
	$('#druid-li').click(function(){
		$('#champion-list').fadeOut(200, function(){
			$('#druid-select').fadeIn(200);
		});
	});
	$('#select-berzerker').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'berzerker', 25, 25, 25, 20, 10, 15);
	});
	$('#select-reaver').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'reaver', 20, 25, 20, 25, 15, 15);
	});
	$('#select-scout').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'scout', 20, 25, 15, 30, 15, 15);
	});
	$('#select-ranger').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'ranger', 10, 25, 15, 25, 25, 20);
	});
	$('#select-volva').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'volva', 10, 15, 15, 20, 30, 30);
	});
	$('#select-druid').click(function(){
		var name = $(this).parent().find('input').val();
		processChar(name, 'druid', 20, 20, 25, 15, 15, 25);
	});
	$(document).delegate('.has-tooltip', 'mouseenter', function(){
		$(this).children('.tooltip').fadeIn(200);
	});
	$(document).delegate('.has-tooltip', 'mouseleave', function(){
		$(this).children('.tooltip').fadeOut(200);
	});
	
	$('#display-all-champions').click(function(){
		$('#index').fadeOut(200, function(){
			$('#champions').fadeIn(200);
		});
	});
	$('#close-champion-details').click(function(){
		$('#champion-details').fadeOut(200);
	});
	$('#close-champions').click(function(){
		$(this).parent().fadeOut(200, function(){
			$('#index').fadeIn(200);
		});
	});
	
	function processChar(character_name, character_class, strength, stamina, vitality, dexterity, intelligence, wisdom){
		if(character_name.length < 2)
		{
			alert('That is not a valid character name.');
			return false;
		}
		for(var i = 0; i<character_name.length; i++)
		{
			if(!(/^[a-zA-Z ’'‘ÆÐƎƏƐƔĲŊŒẞÞǷȜæðǝəɛɣĳŋœĸſßþƿȝĄƁÇĐƊĘĦĮƘŁØƠŞȘŢȚŦŲƯY̨Ƴąɓçđɗęħįƙłøơşșţțŧųưy̨ƴÁÀÂÄǍĂĀÃÅǺĄÆǼǢƁĆĊĈČÇĎḌĐƊÐÉÈĖÊËĚĔĒĘẸƎƏƐĠĜǦĞĢƔáàâäǎăāãåǻąæǽǣɓćċĉčçďḍđɗðéèėêëěĕēęẹǝəɛġĝǧğģɣĤḤĦIÍÌİÎÏǏĬĪĨĮỊĲĴĶƘĹĻŁĽĿʼNŃN̈ŇÑŅŊÓÒÔÖǑŎŌÕŐỌØǾƠŒĥḥħıíìiîïǐĭīĩįịĳĵķƙĸĺļłľŀŉńn̈ňñņŋóòôöǒŏōõőọøǿơœŔŘŖŚŜŠŞȘṢẞŤŢṬŦÞÚÙÛÜǓŬŪŨŰŮŲỤƯẂẀŴẄǷÝỲŶŸȲỸƳŹŻŽẒŕřŗſśŝšşșṣßťţṭŧþúùûüǔŭūũűůųụưẃẁŵẅƿýỳŷÿȳỹƴźżžẓ]$/.test(character_name[i])))
			{
				alert('That is not a valid character name.');
				return false;
			}
		}
		$scope.$apply($scope.characters.push({player: $scope.user_profile.name, name: character_name, class: character_class, image: 'images/'+character_class+'.png', thumbnail: 'images/'+character_class+'-thumb.png', round_thumbnail: 'images/'+character_class+'-thumb-round.png', strength: strength, stamina: stamina, vitality: vitality, dexterity: dexterity, intelligence: intelligence, wisdom: wisdom, hitpoints: 200, seidr:50, level: 1, experience: 0, items: [], talents: [], abilities: [0, 1], active_abilities: []}));
		$('#berzerker-select').fadeOut(200);
		$('#reaver-select').fadeOut(200);
		$('#scout-select').fadeOut(200);
		$('#ranger-select').fadeOut(200);
		$('#volva-select').fadeOut(200);
		$('#druid-select').fadeOut(200);
		$('#champion-list').fadeIn(200);
		$('#champion-select').fadeOut(200);
	};
});

function populate_abilities(abilities_db){
	
	//Normal Attack
	abilities_db[0] = new Ability();
	abilities_db[0].icon = "images/abilities/attack.png";
	abilities_db[0].name = "Normal Attack";
	abilities_db[0].description = "A normal attack that deals 100% weapon damage to targeted enemy.";
	abilities_db[0].base_range = 100;
	
	//Move
	abilities_db[1] = new Ability();
	abilities_db[1].icon = "images/abilities/move.png";
	abilities_db[1].name = "Move";
	abilities_db[1].description = "Move to targeted location, based on character's movement speed. Upon reaching selected location, your character can either move again if he hasn't traveled maximum distance, or proceed with another action.";
	abilities_db[1].base_range = 300;
}

function populate_talents(talents_db){
	
	//+10 strength
	talents_db[0] = new Talent();
	talents_db[0].icon = "images/talents/strength.png";
	talents_db[0].name = "Giant's Strength";
	talents_db[0].description = "Increases this champion's base strength by 10 points.";
	talents_db[0].subsequent = [6];
	talents_db[0].dependancies = [-1];
	talents_db[0].x = -150;
	talents_db[0].y = 0;
	
	//+10 dexterity
	talents_db[1] = new Talent();
	talents_db[1].icon = "images/talents/vitality.png";
	talents_db[1].name = "Rigorous Vitality";
	talents_db[1].description = "Increases this champion's base vitality by 10 points.";
	talents_db[1].subsequent = [];
	talents_db[1].dependancies = [-1];
	talents_db[1].x = -75;
	talents_db[1].y = 130;
	
	//+10 dexterity
	talents_db[2] = new Talent();
	talents_db[2].icon = "images/talents/stamina.png";
	talents_db[2].name = "Hard Training";
	talents_db[2].description = "Increases this champion's base stamina by 10 points.";
	talents_db[2].subsequent = [];
	talents_db[2].dependancies = [-1];
	talents_db[2].x = 75;
	talents_db[2].y = 130;
	
	//+10 dexterity
	talents_db[3] = new Talent();
	talents_db[3].icon = "images/talents/dexterity.png";
	talents_db[3].name = "Swiftness";
	talents_db[3].description = "Increases this champion's base dexterity by 10 points.";
	talents_db[3].subsequent = [];
	talents_db[3].dependancies = [-1];
	talents_db[3].x = 150;
	talents_db[3].y = 0;
	
	//+10 dexterity
	talents_db[4] = new Talent();
	talents_db[4].icon = "images/talents/intelligence.png";
	talents_db[4].name = "Mind Superiority";
	talents_db[4].description = "Increases this champion's base intelligence by 10 points.";
	talents_db[4].subsequent = [];
	talents_db[4].dependancies = [-1];
	talents_db[4].x = 75;
	talents_db[4].y = -130;
	
	//+10 dexterity
	talents_db[5] = new Talent();
	talents_db[5].icon = "images/talents/wisdom.png";
	talents_db[5].name = "Owl's Eyes";
	talents_db[5].description = "Increases this champion's base wisdom by 10 points.";
	talents_db[5].subsequent = [];
	talents_db[5].dependancies = [-1];
	talents_db[5].x = -75;
	talents_db[5].y = -130;
	
	//+10 dexterity
	talents_db[6] = new Talent();
	talents_db[6].icon = "images/talents/brutality.png";
	talents_db[6].name = "Brutality";
	talents_db[6].description = "Increases this champion's physical damage by 3%.";
	talents_db[6].subsequent = [];
	talents_db[6].dependancies = [0];
	talents_db[6].x = -280;
	talents_db[6].y = -75;
}

function drawTalentsInitial(scope)
{
	var start = {x: 480, y: 480};
	var stage = new Kinetic.Stage({
		container: 'champion-details-talents-tree-background',
		width: 960,
		height: 960
	});
	
	var layer = new Kinetic.Layer();
	
	var backgroundLines = new Array();
	var counter=0;
	for(var i = 0; i<scope.talents_db.length; i++)
	{
		if(scope.talents_db[i].dependancies[0] && scope.talents_db[i].dependancies[0] == -1)
		{
			backgroundLines[counter] = new Kinetic.Line({
				points: [start, {x: start.x+scope.talents_db[counter].x, y: start.y+scope.talents_db[counter].y}],
				stroke: '#15247c',
				strokeWidth: 10,
				lineCap: 'round',
				lineJoin: 'round'
			});
			layer.add(backgroundLines[counter]);
			counter++;
		}
		console.log(scope.talents_db[i].subsequent.length);
		for(var j = 0; j<scope.talents_db[i].subsequent.length; j++)
		{
			backgroundLines[counter] = new Kinetic.Line({
				points: [{x: start.x+scope.talents_db[i].x, y: start.y+scope.talents_db[i].y}, {x: start.x+scope.talents_db[scope.talents_db[i].subsequent[j]].x, y: start.y+scope.talents_db[scope.talents_db[i].subsequent[j]].y}],
				stroke: '#15247c',
				strokeWidth: 10,
				lineCap: 'round',
				lineJoin: 'round'
			});
			layer.add(backgroundLines[counter]);
			counter++;
		}
	}
	
	for(var i = 0; i<backgroundLines.length; i++)
	{
		layer.add(backgroundLines[i]);
	}
	
	stage.add(layer);
};