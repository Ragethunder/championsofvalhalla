// Copyright Chris Anderson 2011
// Apache 2.0 License
// jquery.couchProfile.js
// depends on md5, 
// jquery.couchLogin.js and requires.js
// 
// Example Usage (loggedIn and loggedOut callbacks are optional): 
//    $("#myprofilediv").couchProfile({
//        profileReady : function(profile) {
//            alert("hello, do you look like this? "+profile.gravatar_url);
//        }
//    });


(function($) {
    $.couchProfile = {};
    $.couchProfile.templates = {
        profileReady : '<div class="avatar">{{#gravatar_url}}<img src="{{gravatar_url}}"/>{{/gravatar_url}}'
        //newProfile : '<div id="profile-setup"><form><img class="pointer" src="images/triangle-up.png" width="14" height="7"><p>Hello {{name}}, Please setup your user profile.</p><input class="clearing-input" type="text" name="nickname" value="Nickname"><input class="clearing-input" type="text" name="email" value="Label for Gravatar"><input class="clearing-input" type="text" name="url" value="URL"><input type="submit" value="Submit"><input type="hidden" name="userCtxName" value="{{name}}" id="userCtxName"></form></div>'
    };
    
    $.fn.couchProfile = function(session, opts) {
        opts = opts || {};
        var templates = $.couchProfile.templates;
        var userCtx = session.userCtx;
        var widget = $(this);
        // load the profile from the user doc
        var db = $.couch.db(session.info.authentication_db);
        var userDocId = "org.couchdb.user:"+userCtx.name;
        db.openDoc(userDocId, {
            success : function(userDoc) {
                var profile = userDoc["couch.app.profile"];
                if (profile) {
                    profile.name = userDoc.name;
                    profileReady(profile);
                } else {
                    newProfile(userCtx)
                }
            }
        });
        
        function profileReady(profile) {
            widget.html($.mustache(templates.profileReady, profile));
            if (opts.profileReady) {opts.profileReady(profile)};
        };
        
        function storeProfileOnUserDoc(newProfile) {
            // store the user profile on the user account document
            $.couch.userDb(function(db) {
              var userDocId = "org.couchdb.user:"+userCtx.name;
              db.openDoc(userDocId, {
                success : function(userDoc) {
                  userDoc["couch.app.profile"] = newProfile;
                  db.saveDoc(userDoc, {
                    success : function() {
                      newProfile.name = userDoc.name;
                      profileReady(newProfile);
                    }
                  });
                }
              });
            });
        };
        
        function newProfile(userCtx) {
            // widget.find("form").submit(function(e) {
            // e.preventDefault();
            // var form = this;
                // var name = $("input[name=userCtxName]",form).val();
                // var newProfile = {
                  // rand : Math.random().toString()
                  // nickname : $("input[name=nickname]",form).val(),
                  // email : $("input[name=email]",form).val(),
                  // url : $("input[name=url]",form).val()
                // };
                // setup gravatar_url if md5.js is loaded
                // if (hex_md5) {
                  // newProfile.gravatar_url = 'http://www.gravatar.com/avatar/'+hex_md5(newProfile.email || newProfile.rand)+'.jpg?s=40&d=identicon';    
                // }
                // storeProfileOnUserDoc(newProfile);
				
				
			var name = userCtx.name;
			var newProfile = {rand : Math.random().toString()};
			storeProfileOnUserDoc(newProfile);
            
			return false;
            //});
        };
    }
})(jQuery);
