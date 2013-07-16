function(doc) {
  if (doc.profile) {
      var p = doc.save_data || {};
      var r = doc.profile || {};
      var q = doc.created_at || {};
      emit([doc.profile.name, doc.profile.rand, doc.created_at], {save_data: doc.save_data, profile: doc.profile});
  }
};